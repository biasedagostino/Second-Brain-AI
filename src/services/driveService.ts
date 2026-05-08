import { auth } from '../lib/firebase';

export async function uploadToDrive(file: File): Promise<string> {
  const token = localStorage.getItem('google_access_token');
  if (!token) throw new Error("Utente non autenticato o token scaduto");
  
  const metadata = {
    name: file.name,
    mimeType: file.type
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form
  });

  if (!response.ok) {
    throw new Error('Upload fallito: ' + response.statusText);
  }

  const data = await response.json();
  
  // Need to make it public or shareable? Let's assume for now just the id is fine, 
  // or I can get a link. Actually, I need to get the webViewLink.
  // The POST response doesn't always have it. I need to GET the file data.
  
  const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}?fields=webViewLink`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  const fileData = await fileResponse.json();
  return fileData.webViewLink;
}
