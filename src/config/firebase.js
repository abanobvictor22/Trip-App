import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDkgvi4WXRl9DXgEml1x5JNypEJW5j5LPc",
    authDomain: "tripexpensesapp.firebaseapp.com",
    projectId: "tripexpensesapp",
    storageBucket: "tripexpensesapp.firebasestorage.app",
    messagingSenderId: "938835963171",
    appId: "1:938835963171:web:701933050b0d966afb3096"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);