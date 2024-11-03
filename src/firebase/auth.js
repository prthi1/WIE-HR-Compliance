import { signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, sendPasswordResetEmail } from 'firebase/auth';
import { firebaseAuth } from './baseConfig';

setPersistence(firebaseAuth, browserLocalPersistence);

export const signIn = (email, password) => {
    return signInWithEmailAndPassword(firebaseAuth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            return user;
        }).catch((error) => {
            throw error;
        });
};

export const signOutUser = () => {
    return signOut(firebaseAuth).then(() => {
        return true;
    }).catch((error) => {
        throw error;
    });
};

export const resetPassword = (email) => {
    return sendPasswordResetEmail(firebaseAuth, email).then(() => {
        return true;
    }).catch((error) => {
        throw error;
    });
};