const fs = require('fs');

async function testUpload() {
  const fileContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const blob = new Blob([fileContent], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('file', blob); // NO FILENAME
  formData.append('upload_preset', 'twelo_unsigned');
  formData.append('folder', 'twelo_stories');

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/wda7nysx/auto/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    console.log("Response OK:", res.ok);
    console.log("Response:", data);
  } catch(e) {
    console.error("Error:", e);
  }
}

testUpload();
