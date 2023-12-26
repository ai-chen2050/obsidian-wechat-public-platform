import requests
from urllib3 import encode_multipart_formdata

url = "https://api.weixin.qq.com/cgi-bin/material/add_material?&type=image&access_token=75_eaeHI59vvhgHgB0VWcYn9iRJ1cqk2HLt0mtVsSVAqBJVFmYM8sWuW5GlxdmmSb-PtWNmBXRD9IyLFmcgKJvF3nLA_Bhmg_lrWK5SQVfTKxT_nFA36-Psj0b5ypEDEJiADAUVA"

payload = {}
files=[
  ('media',('元宇宙.png',open('/Users/blake/Mcode/mProjs/ob-plugins/dev-plugin/vis.png','rb'),'image/png'))
]
headers = {}

response = requests.request("POST", url, headers=headers, data=payload, files=files)

print(response.text)
