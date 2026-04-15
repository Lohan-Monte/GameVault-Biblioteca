// src/services.js
// Camada de serviços — toda comunicação com Firebase fica aqui

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { auth, db, storage } from "./firebase";

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Cria/atualiza perfil no Firestore
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      photo: user.photoURL,
      role: "user",
      banned: false,
      createdAt: serverTimestamp(),
    });
  }

  return user;
}

export async function logoutUser() {
  await signOut(auth);
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}

// ─────────────────────────────────────────────
// GAMES
// ─────────────────────────────────────────────

export async function getGames() {
  const snap = await getDocs(
    query(collection(db, "games"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getGame(gameId) {
  const snap = await getDoc(doc(db, "games", gameId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createGame(data, imageFile) {
  let imageUrl = data.image || "";

  if (imageFile) {
    imageUrl = await uploadGameImage(imageFile);
  }

  const ref = await addDoc(collection(db, "games"), {
    ...data,
    image: imageUrl,
    reviewsEnabled: true,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateGame(gameId, data, imageFile) {
  let updateData = { ...data };

  if (imageFile) {
    updateData.image = await uploadGameImage(imageFile, gameId);
  }

  await updateDoc(doc(db, "games", gameId), updateData);
}

export async function deleteGame(gameId) {
  // Deleta reviews do jogo
  const reviewsSnap = await getDocs(
    query(collection(db, "reviews"), where("gameId", "==", gameId))
  );
  const deletePromises = reviewsSnap.docs.map((d) =>
    deleteDoc(doc(db, "reviews", d.id))
  );
  await Promise.all(deletePromises);

  await deleteDoc(doc(db, "games", gameId));
}

// ─────────────────────────────────────────────
// STORAGE — imagens de jogos
// ─────────────────────────────────────────────

export async function uploadGameImage(file, gameId) {
  const path = `games/${gameId || Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ─────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────

export async function getReviewsByGame(gameId) {
  const snap = await getDocs(
    query(
      collection(db, "reviews"),
      where("gameId", "==", gameId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllReviews() {
  const snap = await getDocs(
    query(collection(db, "reviews"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserReviewForGame(userId, gameId) {
  const snap = await getDocs(
    query(
      collection(db, "reviews"),
      where("userId", "==", userId),
      where("gameId", "==", gameId)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function upsertReview(userId, gameId, reviewData) {
  const existing = await getUserReviewForGame(userId, gameId);

  if (existing) {
    await updateDoc(doc(db, "reviews", existing.id), {
      ...reviewData,
      updatedAt: serverTimestamp(),
    });
    return existing.id;
  } else {
    const ref = await addDoc(collection(db, "reviews"), {
      ...reviewData,
      userId,
      gameId,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }
}

export async function deleteReview(reviewId) {
  await deleteDoc(doc(db, "reviews", reviewId));
}

// ─────────────────────────────────────────────
// REALTIME — listeners opcionais
// ─────────────────────────────────────────────

export function onGamesChange(callback) {
  return onSnapshot(
    query(collection(db, "games"), orderBy("createdAt", "desc")),
    (snap) => {
      const games = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(games);
    }
  );
}

export function onReviewsChange(gameId, callback) {
  return onSnapshot(
    query(
      collection(db, "reviews"),
      where("gameId", "==", gameId),
      orderBy("createdAt", "desc")
    ),
    (snap) => {
      const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(reviews);
    }
  );
}
