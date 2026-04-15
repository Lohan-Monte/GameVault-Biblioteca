// src/firebase.js
// Substitua os valores YOUR_* pelas suas credenciais do Firebase Console
// Projeto > Configurações > Seus aplicativos > Web

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDkaKN6uaDLrGZRINVSBDjlPpkUlPHSSpU",
  authDomain: "bibliotecagamevault.firebaseapp.com",
  projectId: "bibliotecagamevault",
  storageBucket: "bibliotecagamevault.firebasestorage.app",
  messagingSenderId: "1060224953296",
  appId: "1:1060224953296:web:1bbcb70f27cbac442ce7d5",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
