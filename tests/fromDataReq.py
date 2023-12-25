import requests
from urllib3 import encode_multipart_formdata

url = "https://api.weixin.qq.com/cgi-bin/material/add_material?&type=image&access_token=75_lc7N_6bOE-q5MZ_ce-OqmD7aZdmyyUEN000ZNa8JIO9xAke9CtfkFSHSi1LKejqlyAXpCQRZM3jPtz_3lDw80Lz2k1O5L6TC5ukZ9--6HSKJvt1LKEYk0kc8BqsEOOeABAXHH"

payload = {}
files=[
  ('media',('vis.png',open('/Users/blake/Mcode/mProjs/ob-plugins/dev-plugin/vis.png','rb'),'image/png'))
]
headers = {}

response = requests.request("POST", url, headers=headers, data=payload, files=files)

print(response.text)
