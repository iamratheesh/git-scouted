from http.server import BaseHTTPRequestHandler
import json
import base64
import io
import os

# Set U2NET_HOME to a writable folder in Vercel's read-only environment
os.environ["U2NET_HOME"] = "/tmp/.u2net"

from PIL import Image
from rembg import remove, new_session

# Preload session with the lightweight u2netp model globally to optimize cold starts
try:
    session = new_session("u2netp")
except Exception as e:
    session = None
    print(f"Error preloading rembg session: {e}")

class handler(BaseHTTPRequestHandler):
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
            
            # Use global session or create it if not initialized
            global session
            if session is None:
                session = new_session("u2netp")
                
            # Process background removal
            output_image = remove(input_image, session=session)
            
            # Save output as PNG to preserve transparency
            out_buf = io.BytesIO()
            output_image.save(out_buf, format='PNG')
            out_bytes = out_buf.getvalue()
            
            # Encode output to base64
            out_base64 = base64.b64encode(out_bytes).decode('utf-8')
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response = {
                "image": f"data:image/png;base64,{out_base64}"
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_error_response(500, f"Error processing background removal: {str(e)}")
            
    def send_error_response(self, status_code, message):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response = {"error": message}
        self.wfile.write(json.dumps(response).encode('utf-8'))

if __name__ == '__main__':
    from http.server import HTTPServer
    port = 5328
    server = HTTPServer(('localhost', port), handler)
    print(f"Local Python background removal server running at http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass

