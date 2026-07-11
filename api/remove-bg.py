from http.server import BaseHTTPRequestHandler
import json
import base64
import io
import os
from collections import deque

# Set U2NET_HOME to a writable folder for the background-removal runtime.
os.environ["U2NET_HOME"] = "/tmp/.u2net"
# Disable numba JIT to avoid import-time cache errors in this environment.
os.environ["NUMBA_DISABLE_JIT"] = "1"
ALLOWED_ORIGIN = os.environ.get("BG_REMOVE_CORS_ORIGIN", "*")

from PIL import Image
from rembg import remove, new_session

# Keep the free-tier footprint small by using a single lightweight model.
MODEL_NAME = os.environ.get("BG_REMOVE_MODEL", "u2netp").strip() or "u2netp"
MAX_INPUT_SIZE = int(os.environ.get("BG_REMOVE_MAX_INPUT_SIZE", "768"))

session = None
session_model = None

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error_response(400, "Empty request body")
                return
                
            body = self.rfile.read(content_length)
            content_type = self.headers.get('Content-Type', '')
            
            image_bytes = None
            
            # 1. Try parsing as JSON (contains base64)
            if 'application/json' in content_type:
                try:
                    data = json.loads(body.decode('utf-8'))
                    image_data = data.get('image', '')
                    if ',' in image_data:
                        image_data = image_data.split(',')[1]
                    image_bytes = base64.b64decode(image_data)
                except Exception as e:
                    print(f"Failed to parse JSON body: {e}")
            
            # 2. Try parsing as multipart/form-data
            elif 'multipart/form-data' in content_type:
                try:
                    # Extract boundary
                    boundary = content_type.split("boundary=")[1].strip()
                    boundary_bytes = f"--{boundary}".encode()
                    parts = body.split(boundary_bytes)
                    
                    for part in parts:
                        if b"Content-Disposition" in part:
                            # Headers and body are separated by \r\n\r\n
                            parts_split = part.split(b"\r\n\r\n")
                            if len(parts_split) >= 2:
                                part_headers = parts_split[0]
                                part_body = b"\r\n\r\n".join(parts_split[1:])
                                
                                # Clean up trailing boundary remnants (\r\n or \r\n--)
                                if part_body.endswith(b"\r\n"):
                                    part_body = part_body[:-2]
                                elif part_body.endswith(b"\r\n--"):
                                    part_body = part_body[:-4]
                                
                                # Check if it is the image field or filename is present
                                if b'name="image"' in part_headers or b'filename=' in part_headers:
                                    image_bytes = part_body
                                    break
                    
                    # If field name wasn't explicitly matched, look for content-type image part
                    if not image_bytes:
                        for part in parts:
                            if b"Content-Type: image" in part:
                                parts_split = part.split(b"\r\n\r\n")
                                if len(parts_split) >= 2:
                                    part_body = b"\r\n\r\n".join(parts_split[1:])
                                    if part_body.endswith(b"\r\n"):
                                        part_body = part_body[:-2]
                                    elif part_body.endswith(b"\r\n--"):
                                        part_body = part_body[:-4]
                                    image_bytes = part_body
                                    break
                except Exception as e:
                    print(f"Failed to parse multipart body: {e}")
            
            # 3. Fallback: try parsing body directly as JSON/base64 string or raw bytes
            if not image_bytes:
                try:
                    # Check if body is plain JSON
                    data = json.loads(body.decode('utf-8'))
                    image_data = data.get('image', '')
                    if ',' in image_data:
                        image_data = image_data.split(',')[1]
                    image_bytes = base64.b64decode(image_data)
                except Exception:
                    try:
                        # Try decoding body directly as base64 string
                        body_str = body.decode('utf-8').strip()
                        if body_str.startswith('data:image'):
                            body_str = body_str.split(',')[1]
                        image_bytes = base64.b64decode(body_str)
                    except Exception:
                        # As a last resort, assume raw body bytes
                        image_bytes = body
            
            if not image_bytes:
                self.send_error_response(400, "Could not extract image from request body")
                return
                
            # Load image using Pillow
            input_image = Image.open(io.BytesIO(image_bytes))
            
            # Use the lightweight model after resizing to keep memory use low.
            output_image = process_image(input_image)
            
            # Save output as PNG to preserve transparency
            out_buf = io.BytesIO()
            output_image.save(out_buf, format='PNG')
            out_bytes = out_buf.getvalue()
            
            # Encode output to base64
            out_base64 = base64.b64encode(out_bytes).decode('utf-8')
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            
            response = {
                "image": f"data:image/png;base64,{out_base64}"
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_error_response(500, f"Error processing background removal: {str(e)}")
            
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Vary", "Origin")

    def send_error_response(self, status_code, message):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        response = {"error": message}
        self.wfile.write(json.dumps(response).encode('utf-8'))

def process_image(input_image: Image.Image) -> Image.Image:
    global session, session_model

    prepared_image = resize_image(input_image, MAX_INPUT_SIZE)
    active_session = ensure_session()

    try:
        output_image = remove(
            prepared_image,
            session=active_session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10,
        )
    except TypeError:
        # Older rembg builds may not support alpha_matting args in every runtime.
        output_image = remove(prepared_image, session=active_session)

    session = active_session
    session_model = MODEL_NAME
    return remove_edge_background(output_image)


def ensure_session():
    global session, session_model
    if session is None:
        print(f"[backgroundRemoval] Initializing rembg session '{MODEL_NAME}'")
        session = new_session(MODEL_NAME)
        session_model = MODEL_NAME
    return session


def resize_image(image: Image.Image, max_size: int) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    largest_side = max(width, height)
    if largest_side <= max_size:
        return rgba

    scale = max_size / float(largest_side)
    new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
    return rgba.resize(new_size, Image.Resampling.LANCZOS)


def remove_edge_background(image: Image.Image, tolerance: int = 28) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    corners = [
        rgba.getpixel((0, 0)),
        rgba.getpixel((width - 1, 0)),
        rgba.getpixel((0, height - 1)),
        rgba.getpixel((width - 1, height - 1)),
    ]
    background = tuple(sum(channel[i] for channel in corners) // len(corners) for i in range(3))

    def is_background(pixel):
        if pixel[3] == 0:
            return True
        return (
            abs(pixel[0] - background[0]) <= tolerance
            and abs(pixel[1] - background[1]) <= tolerance
            and abs(pixel[2] - background[2]) <= tolerance
        )

    queue = deque()
    visited = set()

    def enqueue(x, y):
        if (x, y) in visited:
            return
        if is_background(pixels[x, y]):
            visited.add((x, y))
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

        if x > 0:
            enqueue(x - 1, y)
        if x < width - 1:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y < height - 1:
            enqueue(x, y + 1)

    return rgba


if __name__ == '__main__':
    from http.server import HTTPServer
    port = int(os.environ.get("PORT", 5328))
    server = HTTPServer(("0.0.0.0", port), handler)
    print(f"Python background removal server running on 0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
