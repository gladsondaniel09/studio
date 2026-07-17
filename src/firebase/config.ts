export const firebaseConfig = {
  "projectId": "audit-vision-qxwkt",
  "appId": "1:216545904065:web:017396cce5560609539b40",
  "apiKey": "AIzaSyCmI5uDb2jShAwZD4enJRXw-nQ65pUJVDg",
  "authDomain": "audit-vision-qxwkt.firebaseapp.com",
  // Missing entirely before — getStorage() had no bucket to resolve, so every session upload
  // failed at the very first line of saveAsync() with storage/no-default-bucket, silently
  // swallowed by its .catch(console.error), meaning no session was EVER actually persisted.
  "storageBucket": "audit-vision-qxwkt.firebasestorage.app",
  "measurementId": "",
  "messagingSenderId": "216545904065"
};
