import http.client
import subprocess
import sys
import time
import unittest

PORT=18765
class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proc=subprocess.Popen([sys.executable,"server.py","--port",str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        for _ in range(30):
            try:
                c=http.client.HTTPConnection("127.0.0.1",PORT,timeout=.2);c.request("GET","/healthz");
                if c.getresponse().status==200:return
            except OSError:time.sleep(.05)
        _,err=cls.proc.communicate(timeout=1)
        if b"Operation not permitted" in err: raise unittest.SkipTest("sandbox forbids localhost bind")
        raise RuntimeError(f"server did not start: {err.decode()}")
    @classmethod
    def tearDownClass(cls):cls.proc.terminate();cls.proc.wait(timeout=3)
    def get(self,path):
        c=http.client.HTTPConnection("127.0.0.1",PORT,timeout=2);c.request("GET",path);r=c.getresponse();body=r.read();return r,body
    def test_index_assets_and_headers(self):
        r,b=self.get("/");self.assertEqual(r.status,200);self.assertIn(b"Homelab Atlas",b);self.assertIn("default-src 'self'",r.getheader("Content-Security-Policy"));self.assertEqual(r.getheader("X-Content-Type-Options"),"nosniff")
        r,b=self.get("/model.js");self.assertEqual(r.status,200);self.assertIn(b"validateProject",b)
    def test_health(self):r,b=self.get("/healthz");self.assertEqual((r.status,b),(200,b"ok\n"))
    def test_source_and_traversal_denied(self):
        for path in ["/server.py","/../server.py","/%2e%2e/server.py","/.git/config","/"]:
            r,b=self.get(path)
            if path=="/":self.assertNotIn(b"Directory listing",b)
            else:self.assertEqual(r.status,404,path)
if __name__=="__main__":unittest.main()
