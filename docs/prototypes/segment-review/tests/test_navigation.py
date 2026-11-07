"""Exercise navigation handlers in memory; no socket or source mutation required."""
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server

class NavigationTests(unittest.TestCase):
    def test_script_design_review_and_media_routes(self):
        for route,expected,needle in [('/script',200,'片段审阅工作台'),('/script-review/design-review.html',200,'带着修改，回到脚本'),('/script-review/script-bridge.js',200,'script-review/1'),('/segment-review/index.html',200,'成片模式'),('/script-review/../../AGENTS.md',404,'工作台文件不存在')]:
            handler=server.Handler.__new__(server.Handler)
            handler.path=route
            handler.directory=str(server.WEB)
            handler.headers={'Host':'127.0.0.1:5337'}
            handler.server=SimpleNamespace(server_port=5337)
            handler.wfile=BytesIO()
            codes=[]
            handler.send_response=codes.append
            handler.send_header=lambda *args:None
            handler.end_headers=lambda:None
            handler.do_GET()
            self.assertEqual(codes,[expected],route)
            self.assertIn(needle,handler.wfile.getvalue().decode('utf-8'),route)

if __name__=='__main__':unittest.main()
