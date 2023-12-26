import requests

url = "https://api.weixin.qq.com/cgi-bin/material/add_material?&type=video&access_token=75_LpELfFuo7LDV2Nd0soMRLsxTSVWdTAdVAt4-Dx73k3ZsgyopqGXJNiuQLVUrrudVIHgcL6uSE5Ehh_zzOecN5pqvlbbq6tbjmffr5XAMxz8CeKT4QRNzboZNowwWPOhAJAEXW"

payload = {'description': '{"title":"lego", "introduction":"for tet"}'}
files=[
  ('media',('mp4.mp4',open('/Users/blake/Movies/mp4.mp4','rb'),'video/mp4'))
]
headers = {}

response = requests.request("POST", url, headers=headers, data=payload, files=files)

print(response.text)
