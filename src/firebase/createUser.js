import { collection, addDoc } from "firebase/firestore";
import { db } from "./config.js";

export const createUser = async (data) => {
  await addDoc(collection(db, "users"), data /*{
    fullName: "Test User",
    role: "worker",
    createdAt: new Date(),
  }*/);
};