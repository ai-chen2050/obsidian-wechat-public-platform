let formdata = new FormData();

async function getData() { 
    const path = "https://mmbiz.qpic.cn/mmbiz_png/avKRXZvpU06RaicVPeDfRia2jZODXWV7qeRbL32r2FnWySlDTTkicCDWaTCoFszFlchcGxXlBN6efDeNf4sEJvV6w/640?wx_fmt=png"
    const imgresp = await fetch(path);
    blobBytes = await imgresp.blob()
    formdata.append("media", blobBytes, "visionpro.png");
 }

async function run() { 
    await getData();

    let requestOptions = {
      method: 'POST',
      body: formdata,
      redirect: 'follow'
    };
    
    fetch("https://api.weixin.qq.com/cgi-bin/material/add_material?&type=image&access_token=75_phl7Y1IN19dxo0fm03Iki8lqK0L7F4x3pm8br4r6kodVdGpOwnOmZIuad_htqPAP435hOMk8eNDtkIrhL6aFJIC8ESKXB7IiCzKzVY3jrn7seH2u97z3aAN16e8JJNeAJAMMQ", requestOptions)
      .then(response => response.text())
      .then(result => console.log(result))
      .catch(error => console.log('error', error));
}

run()