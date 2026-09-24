// ============================================================
//  CONFIGURATION DU CLUB — seul fichier à modifier
// ============================================================

// 1) Collez ici la config de votre projet Firebase
//    (Console Firebase > Paramètres du projet > Vos applications > Web).
//    Tant que apiKey vaut "A_REMPLIR", l'app tourne en MODE DÉMO
//    (données stockées uniquement sur le téléphone, pas de partage).
export const firebaseConfig = {
  apiKey: 'AIzaSyClw8c5MvShYZm1m7XncKujON8_oUwCWqA',
  authDomain: 'knights-live-2026.firebaseapp.com',
  projectId: 'knights-live-2026',
  storageBucket: 'knights-live-2026.firebasestorage.app',
  messagingSenderId: '1050764649481',
  appId: '1:1050764649481:web:419c6a60d50a9350a104d8',
};

// 2) Les membres du club (prénoms affichés à la connexion).
export const MEMBERS = ['Antoine', 'Guillaume', 'John', 'Pierre', 'Tom', 'Valério'];

// 3) Le code club N'EST PAS ici : il est vérifié côté serveur
//    dans firestore.rules (cherchez "CODE_CLUB").

// Nom affiché de l'événement
export const EVENT = { name: 'Whisky Live Paris 2026', short: 'WLP 26' };
