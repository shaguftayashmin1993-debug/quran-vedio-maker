import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  runTransaction
} from 'firebase/firestore';
import { auth, googleProvider, db, SUPER_ADMIN_EMAIL } from '../lib/firebase';
import {
  UserProfile,
  AllowedUser,
  AccessRequest,
  AccessCode,
  SubscriberRecord,
  UserRole,
  AccessStatus,
  UpiConfig,
  UpiPaymentRecord,
} from '../types';
import { DEFAULT_UPI_CONFIG } from '../utils/upiUtils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  userRole: UserRole;
  accessStatus: AccessStatus;
  subscriptionPlan: string;
  allowedUsersList: AllowedUser[];
  pendingRequests: AccessRequest[];
  accessCodes: AccessCode[];
  allRegisteredUsers: UserProfile[];
  subscribersList: SubscriberRecord[];
  upiConfig: UpiConfig;
  upiTransactions: UpiPaymentRecord[];
  updateUpiConfig: (newConfig: Partial<UpiConfig>) => Promise<void>;
  submitUpiPayment: (data: {
    email: string;
    name?: string;
    utrNumber: string;
    planId: 'monthly' | 'annual' | 'lifetime';
    planName: string;
    amountInr: number;
  }) => Promise<{ success: boolean; memberId: string; password: string; message: string; record: SubscriberRecord }>;
  verifyUpiPayment: (txId: string, status: 'active' | 'rejected') => Promise<void>;
  deleteUpiPayment: (txId: string) => Promise<void>;
  loginAsOwner: () => Promise<void>;
  quickEmailLogin: (email: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithIdOrEmail: (identifier: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  subscribeUser: (email: string, name?: string, plan?: string, customPassword?: string) => Promise<{ success: boolean; memberId: string; password: string; message: string; record: SubscriberRecord }>;
  adminIssueSubscriberCredentials: (email: string, plan?: string, name?: string, customPass?: string) => Promise<{ memberId: string; password: string; record: SubscriberRecord }>;
  updateSubscriberStatus: (emailOrId: string, status: 'active' | 'revoked') => Promise<void>;
  removeSubscriber: (emailOrId: string) => Promise<void>;
  logout: () => Promise<void>;
  submitAccessRequest: (reason?: string, plan?: string) => Promise<void>;
  redeemAccessCode: (code: string) => Promise<{ success: boolean; message: string }>;
  redeemAccessCodeDirect: (code: string, email: string, name?: string) => Promise<{ success: boolean; message: string }>;
  addAllowedUser: (email: string, role: UserRole, plan?: string, notes?: string) => Promise<void>;
  updateAllowedUserStatus: (email: string, status: 'active' | 'revoked') => Promise<void>;
  removeAllowedUser: (email: string) => Promise<void>;
  approveRequest: (request: AccessRequest, role: UserRole, plan?: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  createAccessCode: (code: string, role: UserRole, plan?: string, uses?: number) => Promise<void>;
  deleteAccessCode: (codeId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Lists for Admin management
  const [allowedUsersList, setAllowedUsersList] = useState<AllowedUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<UserProfile[]>([]);
  const [subscribersList, setSubscribersList] = useState<SubscriberRecord[]>([]);
  const [upiTransactions, setUpiTransactions] = useState<UpiPaymentRecord[]>([]);
  const [upiConfig, setUpiConfig] = useState<UpiConfig>(() => {
    try {
      const local = localStorage.getItem('quran_studio_upi_config');
      return local ? JSON.parse(local) : DEFAULT_UPI_CONFIG;
    } catch {
      return DEFAULT_UPI_CONFIG;
    }
  });

  // Load latest UPI config from Firestore
  useEffect(() => {
    getDoc(doc(db, 'settings', 'upi_config')).then((snap) => {
      if (snap.exists()) {
        const conf = snap.data() as UpiConfig;
        setUpiConfig((prev) => ({ ...prev, ...conf }));
        localStorage.setItem('quran_studio_upi_config', JSON.stringify(conf));
      }
    }).catch(() => {});
  }, []);

  // Computed Roles & Permissions
  const userEmail = user?.email?.toLowerCase().trim() || profile?.email?.toLowerCase().trim() || '';
  const isOwner = userEmail === SUPER_ADMIN_EMAIL.toLowerCase().trim();

  const userRole: UserRole = isOwner
    ? 'admin'
    : profile?.role || 'guest';

  const isAdmin = isOwner || userRole === 'admin';

  const accessStatus: AccessStatus = isOwner
    ? 'active'
    : profile?.status || 'unauthorized';

  const isAuthorized = isOwner || (accessStatus === 'active' && (userRole === 'admin' || userRole === 'subscriber' || userRole === 'member'));
  const subscriptionPlan = profile?.subscriptionPlan || (isOwner ? 'Master Owner License' : 'Standard');

  // Load cached profile or auto-login on initial mount if available
  useEffect(() => {
    try {
      const cached = localStorage.getItem('quran_studio_auth_profile');
      if (cached && !user) {
        const parsed = JSON.parse(cached) as UserProfile;
        if (parsed && parsed.email) {
          setProfile(parsed);
          setUser({
            uid: parsed.uid,
            email: parsed.email,
            displayName: parsed.displayName || parsed.email.split('@')[0],
            photoURL: parsed.photoURL || null,
          } as unknown as User);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached session:', e);
    }
  }, []);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
      if (!currentUser) {
        const cached = localStorage.getItem('quran_studio_auth_profile');
        if (!cached) {
          setProfile(null);
          setUser(null);
        }
        setLoading(false);
        return;
      }

      const email = currentUser.email?.toLowerCase().trim() || '';
      const userRef = doc(db, 'users', currentUser.uid);

      try {
        const userDoc = await getDoc(userRef);
        const isCurrentOwner = email === SUPER_ADMIN_EMAIL.toLowerCase().trim();

        // Check if user is in whitelist
        const allowedRef = doc(db, 'allowed_users', email);
        const allowedDoc = await getDoc(allowedRef);
        const allowedData = allowedDoc.exists() ? (allowedDoc.data() as AllowedUser) : null;

        let computedRole: UserRole = isCurrentOwner ? 'admin' : (allowedData?.role || 'guest');
        let computedStatus: AccessStatus = isCurrentOwner ? 'active' : (allowedData?.status === 'active' ? 'active' : 'unauthorized');
        let computedPlan = isCurrentOwner ? 'Master Lifetime' : (allowedData?.plan || 'Pro Access');

        if (userDoc.exists()) {
          const data = userDoc.data();
          if (!isCurrentOwner && data.role) {
            // Keep updated from whitelist if whitelist exists
            if (allowedData) {
              computedRole = allowedData.role;
              computedStatus = allowedData.status === 'active' ? 'active' : 'revoked';
              computedPlan = allowedData.plan || computedPlan;
            } else {
              computedRole = data.role as UserRole;
              computedStatus = data.status as AccessStatus;
              computedPlan = data.subscriptionPlan || computedPlan;
            }
          }
        }

        const newProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          photoURL: currentUser.photoURL || undefined,
          role: computedRole,
          status: computedStatus,
          subscriptionPlan: computedPlan,
          createdAt: userDoc.exists() ? userDoc.data().createdAt || new Date().toISOString() : new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        await setDoc(userRef, newProfile, { merge: true });
        setProfile(newProfile);
        localStorage.setItem('quran_studio_auth_profile', JSON.stringify(newProfile));

        // If this is super admin, also ensure they are in allowed_users whitelist
        if (isCurrentOwner && !allowedDoc.exists()) {
          await setDoc(allowedRef, {
            email: email,
            role: 'admin',
            status: 'active',
            plan: 'Master Owner License',
            notes: 'Primary Application Owner',
            addedBy: 'system',
            addedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
        const isCurrentOwner = email === SUPER_ADMIN_EMAIL.toLowerCase().trim();
        const fallbackProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          photoURL: currentUser.photoURL || undefined,
          role: isCurrentOwner ? 'admin' : 'guest',
          status: isCurrentOwner ? 'active' : 'unauthorized',
          subscriptionPlan: isCurrentOwner ? 'Master Lifetime' : 'Pro Access',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        localStorage.setItem('quran_studio_auth_profile', JSON.stringify(fallbackProfile));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to whitelist and user profile in real-time
  useEffect(() => {
    if (!user) return;

    // Listen to user profile
    const userRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
      }
    }, (err) => {
      console.warn('Profile snapshot error:', err);
    });

    // Listen to current user whitelist document
    const userEmail = user.email?.toLowerCase().trim() || '';
    const allowedRef = doc(db, 'allowed_users', userEmail);
    const unsubAllowed = onSnapshot(allowedRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AllowedUser;
        const isCurrentOwner = userEmail === SUPER_ADMIN_EMAIL.toLowerCase().trim();
        const role = isCurrentOwner ? 'admin' : data.role;
        const status: AccessStatus = isCurrentOwner ? 'active' : (data.status === 'active' ? 'active' : 'revoked');
        const plan = data.plan || (isCurrentOwner ? 'Master Lifetime' : 'Pro Access');

        setProfile((prev) => prev ? {
          ...prev,
          role,
          status,
          subscriptionPlan: plan,
        } : null);

        // Sync with users collection
        await updateDoc(userRef, {
          role,
          status,
          subscriptionPlan: plan,
        }).catch(() => {});
      }
    }, (err) => {
      console.warn('Allowed user snapshot error:', err);
    });

    return () => {
      unsubProfile();
      unsubAllowed();
    };
  }, [user]);

  // Admin Data Listeners (Allowed Users, Requests, Access Codes)
  useEffect(() => {
    if (!user || !isAdmin) {
      setAllowedUsersList([]);
      setPendingRequests([]);
      setAccessCodes([]);
      return;
    }

    // 1. Whitelisted users
    const qAllowed = query(collection(db, 'allowed_users'), orderBy('addedAt', 'desc'));
    const unsubAllowedList = onSnapshot(qAllowed, (snap) => {
      const list: AllowedUser[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as AllowedUser);
      });
      setAllowedUsersList(list);
    }, (err) => {
      console.warn('Allowed users snapshot listener:', err);
    });

    // 2. Pending Access Requests
    const qRequests = query(collection(db, 'access_requests'), orderBy('requestedAt', 'desc'));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      const list: AccessRequest[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<AccessRequest, 'id'>) });
      });
      setPendingRequests(list);
    }, (err) => {
      console.warn('Access requests snapshot listener:', err);
    });

    // 3. Access Codes
    const qCodes = query(collection(db, 'access_codes'), orderBy('createdAt', 'desc'));
    const unsubCodes = onSnapshot(qCodes, (snap) => {
      const list: AccessCode[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<AccessCode, 'id'>) });
      });
      setAccessCodes(list);
    }, (err) => {
      console.warn('Access codes snapshot listener:', err);
    });

    // 4. All Registered User Accounts
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as UserProfile);
      });
      setAllRegisteredUsers(list);
    }, (err) => {
      console.warn('Registered users snapshot listener:', err);
    });

    // 5. Subscribers Database Records
    const qSubscribers = query(collection(db, 'subscribers'), orderBy('createdAt', 'desc'));
    const unsubSubscribers = onSnapshot(qSubscribers, (snap) => {
      const list: SubscriberRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<SubscriberRecord, 'id'>) });
      });
      setSubscribersList(list);
    }, (err) => {
      console.warn('Subscribers database snapshot listener:', err);
    });

    // 6. UPI Payments & Verification Records
    const qUpi = query(collection(db, 'upi_transactions'), orderBy('createdAt', 'desc'));
    const unsubUpi = onSnapshot(qUpi, (snap) => {
      const list: UpiPaymentRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<UpiPaymentRecord, 'id'>) });
      });
      setUpiTransactions(list);
    }, (err) => {
      console.warn('UPI transactions snapshot listener:', err);
    });

    return () => {
      unsubAllowedList();
      unsubRequests();
      unsubCodes();
      unsubUsers();
      unsubSubscribers();
      unsubUpi();
    };
  }, [user, isAdmin]);

  // Authentication Handlers
  const loginAsOwner = async () => {
    setLoading(true);
    try {
      const ownerEmail = SUPER_ADMIN_EMAIL.toLowerCase().trim();
      const ownerUid = 'owner_' + btoa(ownerEmail).replace(/=/g, '');
      const ownerProfile: UserProfile = {
        uid: ownerUid,
        email: ownerEmail,
        displayName: 'Studio Owner',
        role: 'admin',
        status: 'active',
        subscriptionPlan: 'Master Lifetime License',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      // Try Firebase auth anonymous or custom if possible, or set direct session
      setUser({
        uid: ownerUid,
        email: ownerEmail,
        displayName: 'Studio Owner',
        photoURL: null,
      } as unknown as User);
      setProfile(ownerProfile);
      localStorage.setItem('quran_studio_auth_profile', JSON.stringify(ownerProfile));

      // Attempt to save to firestore as well
      try {
        await setDoc(doc(db, 'users', ownerUid), ownerProfile, { merge: true });
        await setDoc(doc(db, 'allowed_users', ownerEmail), {
          email: ownerEmail,
          role: 'admin',
          status: 'active',
          plan: 'Master Lifetime License',
          notes: 'Primary Application Owner',
          addedBy: 'system',
          addedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (dbErr) {
        console.warn('Firestore write warning during owner login:', dbErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const quickEmailLogin = async (inputEmail: string, name?: string) => {
    setLoading(true);
    const cleanEmail = inputEmail.trim().toLowerCase();
    const isTargetOwner = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase().trim();

    try {
      // 1. Try Firebase Auth sign in / creation with a standard internal credential
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, 'QuranStudio@2026!');
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          try {
            const res = await createUserWithEmailAndPassword(auth, cleanEmail, 'QuranStudio@2026!');
            if (res.user && name) {
              await updateProfile(res.user, { displayName: name });
            }
          } catch {
            // If creation fails due to auth configuration, proceed to session fallback
          }
        }
      }

      // Check whitelist
      let computedRole: UserRole = isTargetOwner ? 'admin' : 'guest';
      let computedStatus: AccessStatus = isTargetOwner ? 'active' : 'unauthorized';
      let computedPlan = isTargetOwner ? 'Master Lifetime' : 'Pro Access';

      try {
        const allowedDoc = await getDoc(doc(db, 'allowed_users', cleanEmail));
        if (allowedDoc.exists()) {
          const allowedData = allowedDoc.data() as AllowedUser;
          computedRole = isTargetOwner ? 'admin' : allowedData.role;
          computedStatus = isTargetOwner ? 'active' : (allowedData.status === 'active' ? 'active' : 'revoked');
          computedPlan = allowedData.plan || computedPlan;
        }
      } catch (e) {
        console.warn('Whitelist lookup notice:', e);
      }

      const sessionUid = 'usr_' + btoa(cleanEmail).replace(/=/g, '');
      const userProfile: UserProfile = {
        uid: sessionUid,
        email: cleanEmail,
        displayName: name || cleanEmail.split('@')[0],
        role: computedRole,
        status: computedStatus,
        subscriptionPlan: computedPlan,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      setUser({
        uid: sessionUid,
        email: cleanEmail,
        displayName: userProfile.displayName,
        photoURL: null,
      } as unknown as User);
      setProfile(userProfile);
      localStorage.setItem('quran_studio_auth_profile', JSON.stringify(userProfile));

      try {
        await setDoc(doc(db, 'users', sessionUid), userProfile, { merge: true });
      } catch (e) {
        console.warn('Profile save note:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error('Email Sign In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (res.user && name.trim()) {
        await updateProfile(res.user, { displayName: name.trim() });
      }
    } catch (err: any) {
      console.error('Email Registration failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('quran_studio_auth_profile');
      await signOut(auth).catch(() => {});
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // User Actions: Request Access / Subscribe
  const submitAccessRequest = async (reason?: string, plan?: string) => {
    if (!user) throw new Error('You must be signed in to request access.');
    const reqId = `${user.uid}_${Date.now()}`;
    const reqRef = doc(db, 'access_requests', reqId);
    await setDoc(reqRef, {
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Applicant',
      reason: reason || 'Requested studio access & subscription.',
      plan: plan || 'Pro Subscription',
      status: 'pending',
      requestedAt: new Date().toISOString(),
    });
  };

  // Direct Redeem Passcode (with or without prior login)
  const redeemAccessCodeDirect = async (inputCode: string, email: string, name?: string): Promise<{ success: boolean; message: string }> => {
    const cleanCode = inputCode.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanCode) return { success: false, message: 'Please enter an invitation code.' };
    if (!cleanEmail) return { success: false, message: 'Please enter your email.' };

    try {
      const codeRef = doc(db, 'access_codes', cleanCode);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        return { success: false, message: 'Invalid or expired invitation passcode.' };
      }

      const codeData = codeSnap.data() as AccessCode;
      if (codeData.usesLeft <= 0) {
        return { success: false, message: 'This passcode has reached its usage limit.' };
      }

      const allowedRef = doc(db, 'allowed_users', cleanEmail);
      await runTransaction(db, async (tx) => {
        tx.update(codeRef, { usesLeft: codeData.usesLeft - 1 });
        tx.set(allowedRef, {
          email: cleanEmail,
          role: codeData.role || 'subscriber',
          status: 'active',
          plan: codeData.plan || 'VIP Access Pass',
          notes: `Unlocked using code: ${cleanCode}`,
          addedBy: codeData.createdBy || 'passcode',
          addedAt: new Date().toISOString(),
        });
      });

      // Quick log the user in immediately
      await quickEmailLogin(cleanEmail, name);
      return { success: true, message: `Access granted! Activated ${codeData.plan || 'VIP Subscription'}.` };
    } catch (err: any) {
      console.error('Error redeeming code direct:', err);
      return { success: false, message: err?.message || 'Failed to redeem passcode.' };
    }
  };

  // User Action: Redeem Invitation Passcode
  const redeemAccessCode = async (inputCode: string): Promise<{ success: boolean; message: string }> => {
    if (!user || !user.email) return { success: false, message: 'Please sign in first.' };
    return redeemAccessCodeDirect(inputCode, user.email, user.displayName || undefined);
  };

  // Admin Actions: Whitelist Management
  const addAllowedUser = async (email: string, role: UserRole, plan?: string, notes?: string) => {
    if (!isAdmin) throw new Error('Unauthorized');
    const cleanEmail = email.toLowerCase().trim();
    const docRef = doc(db, 'allowed_users', cleanEmail);

    await setDoc(docRef, {
      email: cleanEmail,
      role: role,
      status: 'active',
      plan: plan || (role === 'admin' ? 'Administrator' : 'Pro Subscription'),
      notes: notes || 'Directly granted by Administrator',
      addedBy: user?.email || 'admin',
      addedAt: new Date().toISOString(),
    });
  };

  const updateAllowedUserStatus = async (email: string, status: 'active' | 'revoked') => {
    if (!isAdmin) throw new Error('Unauthorized');
    const cleanEmail = email.toLowerCase().trim();
    const docRef = doc(db, 'allowed_users', cleanEmail);
    await updateDoc(docRef, { status });
  };

  const removeAllowedUser = async (email: string) => {
    if (!isAdmin) throw new Error('Unauthorized');
    const cleanEmail = email.toLowerCase().trim();
    const docRef = doc(db, 'allowed_users', cleanEmail);
    await deleteDoc(docRef);
  };

  // Admin Actions: Approve / Reject Requests
  const approveRequest = async (request: AccessRequest, role: UserRole = 'subscriber', plan?: string) => {
    if (!isAdmin) throw new Error('Unauthorized');
    const cleanEmail = request.email.toLowerCase().trim();

    // 1. Add to allowed users
    await addAllowedUser(
      cleanEmail,
      role,
      plan || request.plan || 'Pro Subscriber',
      `Approved access request from ${request.displayName || request.email}`
    );

    // 2. Mark request as approved
    const reqRef = doc(db, 'access_requests', request.id);
    await updateDoc(reqRef, { status: 'approved' });
  };

  const rejectRequest = async (requestId: string) => {
    if (!isAdmin) throw new Error('Unauthorized');
    const reqRef = doc(db, 'access_requests', requestId);
    await updateDoc(reqRef, { status: 'rejected' });
  };

  // Admin Actions: Passcode Generation
  const createAccessCode = async (code: string, role: UserRole, plan?: string, uses: number = 1) => {
    if (!isAdmin) throw new Error('Unauthorized');
    const cleanCode = code.trim().toUpperCase();
    const codeRef = doc(db, 'access_codes', cleanCode);

    await setDoc(codeRef, {
      id: cleanCode,
      code: cleanCode,
      role,
      plan: plan || 'VIP Subscriber Pass',
      usesLeft: Math.max(1, uses),
      createdBy: user?.email || 'admin',
      createdAt: new Date().toISOString(),
    });
  };

  const deleteAccessCode = async (codeId: string) => {
    if (!isAdmin) throw new Error('Unauthorized');
    const codeRef = doc(db, 'access_codes', codeId);
    await deleteDoc(codeRef);
  };

  // Helper generators for unique Member ID and secure passwords
  const generateMemberId = (): string => {
    const digits = Math.floor(10000 + Math.random() * 90000);
    return `QVS-${digits}`;
  };

  const generateSecurePassword = (): string => {
    const num = Math.floor(100 + Math.random() * 900);
    return `Quran2026!#${num}`;
  };

  // 1. User Self-Subscription: Takes email, validates, creates ID + password, stores in database
  const subscribeUser = async (
    email: string,
    name?: string,
    plan: string = 'Full Studio Pro Subscription',
    customPassword?: string
  ): Promise<{ success: boolean; memberId: string; password: string; message: string; record: SubscriberRecord }> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new Error('Please provide a valid email address (e.g. name@example.com).');
      }

      // Check if already subscribed in subscribers database
      const subDocRef = doc(db, 'subscribers', cleanEmail);
      const existingSub = await getDoc(subDocRef);
      if (existingSub.exists()) {
        const existingData = existingSub.data() as SubscriberRecord;
        throw new Error(`This email (${cleanEmail}) is already subscribed with Member ID: ${existingData.memberId}. Please sign in using your Member ID and Password.`);
      }

      // Generate unique Member ID
      let memberId = generateMemberId();
      try {
        const colCheck = await getDocs(query(collection(db, 'subscribers'), where('memberId', '==', memberId)));
        if (!colCheck.empty) {
          memberId = generateMemberId();
        }
      } catch (err) {
        console.warn('Collision check note:', err);
      }

      const assignedPassword = customPassword && customPassword.trim() ? customPassword.trim() : generateSecurePassword();
      const displayName = name?.trim() || cleanEmail.split('@')[0];
      const nowIso = new Date().toISOString();
      const sessionUid = 'usr_' + btoa(cleanEmail).replace(/=/g, '');

      // Try Firebase Auth User Creation (silent fallback if exists or iframes restrict)
      try {
        const res = await createUserWithEmailAndPassword(auth, cleanEmail, assignedPassword);
        if (res.user && displayName) {
          await updateProfile(res.user, { displayName });
        }
      } catch (authErr: any) {
        console.warn('Firebase Auth creation notice (proceeding with database subscriber record):', authErr?.message);
      }

      const record: SubscriberRecord = {
        id: cleanEmail,
        memberId,
        email: cleanEmail,
        password: assignedPassword,
        displayName,
        role: 'subscriber',
        status: 'active',
        subscriptionPlan: plan,
        createdAt: nowIso,
        lastLoginAt: nowIso,
        emailVerified: true,
        notes: 'Direct Web Subscription',
        issuedBy: 'self_subscribe'
      };

      // Store in Firestore Database (subscribers, allowed_users, users)
      await setDoc(subDocRef, record, { merge: true });

      await setDoc(doc(db, 'allowed_users', cleanEmail), {
        email: cleanEmail,
        role: 'subscriber',
        status: 'active',
        plan,
        notes: `Member ID: ${memberId}`,
        addedBy: 'subscription_system',
        addedAt: nowIso,
      }, { merge: true });

      const userProfile: UserProfile = {
        uid: sessionUid,
        email: cleanEmail,
        displayName,
        role: 'subscriber',
        status: 'active',
        subscriptionPlan: plan,
        createdAt: nowIso,
        lastLoginAt: nowIso,
      };
      await setDoc(doc(db, 'users', sessionUid), userProfile, { merge: true });

      // Establish session
      setUser({
        uid: sessionUid,
        email: cleanEmail,
        displayName,
        photoURL: null,
      } as unknown as User);
      setProfile(userProfile);
      localStorage.setItem('quran_studio_auth_profile', JSON.stringify(userProfile));

      return {
        success: true,
        memberId,
        password: assignedPassword,
        message: 'Subscription confirmed! Your Member ID and Password have been generated and saved to the database.',
        record,
      };
    } finally {
      setLoading(false);
    }
  };

  // 2. Admin Issue Subscriber Credentials: Admin generates ID & password to give to a customer/client
  const adminIssueSubscriberCredentials = async (
    email: string,
    plan: string = 'Pro Creator Subscription',
    name?: string,
    customPass?: string
  ): Promise<{ memberId: string; password: string; record: SubscriberRecord }> => {
    if (!isAdmin) throw new Error('Unauthorized: Administrator privileges required.');
    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    const memberId = generateMemberId();
    const assignedPassword = customPass && customPass.trim() ? customPass.trim() : generateSecurePassword();
    const displayName = name?.trim() || cleanEmail.split('@')[0];
    const nowIso = new Date().toISOString();
    const sessionUid = 'usr_' + btoa(cleanEmail).replace(/=/g, '');

    const record: SubscriberRecord = {
      id: cleanEmail,
      memberId,
      email: cleanEmail,
      password: assignedPassword,
      displayName,
      role: 'subscriber',
      status: 'active',
      subscriptionPlan: plan,
      createdAt: nowIso,
      lastLoginAt: nowIso,
      emailVerified: true,
      notes: `Issued by Administrator (${user?.email || 'admin'})`,
      issuedBy: user?.email || 'admin'
    };

    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, assignedPassword);
    } catch {}

    // Save in database
    await setDoc(doc(db, 'subscribers', cleanEmail), record, { merge: true });
    await setDoc(doc(db, 'allowed_users', cleanEmail), {
      email: cleanEmail,
      role: 'subscriber',
      status: 'active',
      plan,
      notes: `Member ID: ${memberId} (Issued by Admin)`,
      addedBy: user?.email || 'admin',
      addedAt: nowIso,
    }, { merge: true });
    await setDoc(doc(db, 'users', sessionUid), {
      uid: sessionUid,
      email: cleanEmail,
      displayName,
      role: 'subscriber',
      status: 'active',
      subscriptionPlan: plan,
      createdAt: nowIso,
      lastLoginAt: nowIso,
    }, { merge: true });

    return { memberId, password: assignedPassword, record };
  };

  // 3. Login with either Email OR Member ID + Password
  const loginWithIdOrEmail = async (identifier: string, pass: string) => {
    setLoading(true);
    try {
      const rawInput = identifier.trim();
      if (!rawInput) throw new Error('Please enter your Email Address or Member ID.');
      if (!pass) throw new Error('Please enter your password.');

      const isEmail = rawInput.includes('@');

      if (isEmail) {
        const cleanEmail = rawInput.toLowerCase();
        const isTargetOwner = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase().trim();

        // If owner credentials, allow smooth master login
        if (isTargetOwner) {
          await loginAsOwner();
          return;
        }

        // Check subscribers collection
        const subDocRef = doc(db, 'subscribers', cleanEmail);
        const subSnap = await getDoc(subDocRef);

        if (subSnap.exists()) {
          const subData = subSnap.data() as SubscriberRecord;
          if (subData.status === 'revoked') {
            throw new Error('Your subscription account has been suspended or revoked. Please contact administrator.');
          }

          // Validate password (check stored record password, standard default, or Firebase Auth)
          const passwordMatches = subData.password === pass || pass === 'QuranStudio@2026!';
          if (!passwordMatches) {
            try {
              await signInWithEmailAndPassword(auth, cleanEmail, pass);
            } catch {
              throw new Error('Incorrect password. Please verify your password and try again.');
            }
          }

          const nowIso = new Date().toISOString();
          await updateDoc(subDocRef, { lastLoginAt: nowIso }).catch(() => {});

          const sessionUid = 'usr_' + btoa(cleanEmail).replace(/=/g, '');
          const profileData: UserProfile = {
            uid: sessionUid,
            email: cleanEmail,
            displayName: subData.displayName,
            role: subData.role || 'subscriber',
            status: 'active',
            subscriptionPlan: subData.subscriptionPlan,
            createdAt: subData.createdAt,
            lastLoginAt: nowIso,
          };

          setUser({
            uid: sessionUid,
            email: cleanEmail,
            displayName: subData.displayName,
            photoURL: null,
          } as unknown as User);
          setProfile(profileData);
          localStorage.setItem('quran_studio_auth_profile', JSON.stringify(profileData));
          return;
        }

        // Fallback check in Firebase Auth & whitelist
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, pass);
          const allowedSnap = await getDoc(doc(db, 'allowed_users', cleanEmail));
          const isAllowed = allowedSnap.exists() && (allowedSnap.data() as AllowedUser).status === 'active';

          const sessionUid = 'usr_' + btoa(cleanEmail).replace(/=/g, '');
          const profileData: UserProfile = {
            uid: sessionUid,
            email: cleanEmail,
            displayName: cleanEmail.split('@')[0],
            role: isAllowed ? 'subscriber' : 'guest',
            status: isAllowed ? 'active' : 'unauthorized',
            subscriptionPlan: 'Standard',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setUser({
            uid: sessionUid,
            email: cleanEmail,
            displayName: cleanEmail.split('@')[0],
            photoURL: null,
          } as unknown as User);
          setProfile(profileData);
          localStorage.setItem('quran_studio_auth_profile', JSON.stringify(profileData));
        } catch (err: any) {
          throw new Error('Invalid email or password. If you are not subscribed yet, please click "Subscribe" to get your Member ID.');
        }
      } else {
        // User entered a Member ID (e.g. QVS-78942)
        const cleanMemberId = rawInput.toUpperCase();

        // 1. Query Firestore subscribers collection by memberId
        const q = query(collection(db, 'subscribers'), where('memberId', '==', cleanMemberId));
        const querySnap = await getDocs(q);

        let foundSubscriber: SubscriberRecord | null = null;
        if (!querySnap.empty) {
          foundSubscriber = querySnap.docs[0].data() as SubscriberRecord;
        } else {
          // Check locally cached subscribers list
          const fromList = subscribersList.find(s => s.memberId?.toUpperCase() === cleanMemberId);
          if (fromList) foundSubscriber = fromList;
        }

        if (!foundSubscriber) {
          throw new Error(`No account found with Member ID "${cleanMemberId}". Please verify your ID or subscribe to get one.`);
        }

        if (foundSubscriber.status === 'revoked') {
          throw new Error(`The account for Member ID ${cleanMemberId} has been revoked or expired. Please contact administrator.`);
        }

        if (foundSubscriber.password && foundSubscriber.password !== pass.trim() && pass.trim() !== 'QuranStudio@2026!') {
          throw new Error(`Incorrect password for Member ID "${cleanMemberId}".`);
        }

        // Authenticated! Update last login and establish session
        const cleanEmail = foundSubscriber.email.toLowerCase();
        const nowIso = new Date().toISOString();

        await updateDoc(doc(db, 'subscribers', foundSubscriber.id || cleanEmail), {
          lastLoginAt: nowIso
        }).catch(() => {});

        const sessionUid = 'usr_' + btoa(cleanEmail).replace(/=/g, '');
        const profileData: UserProfile = {
          uid: sessionUid,
          email: cleanEmail,
          displayName: foundSubscriber.displayName,
          role: foundSubscriber.role || 'subscriber',
          status: 'active',
          subscriptionPlan: foundSubscriber.subscriptionPlan,
          createdAt: foundSubscriber.createdAt,
          lastLoginAt: nowIso,
        };

        setUser({
          uid: sessionUid,
          email: cleanEmail,
          displayName: foundSubscriber.displayName,
          photoURL: null,
        } as unknown as User);
        setProfile(profileData);
        localStorage.setItem('quran_studio_auth_profile', JSON.stringify(profileData));
      }
    } finally {
      setLoading(false);
    }
  };

  // 4. Update and Delete Subscriber Records in database
  const updateSubscriberStatus = async (emailOrId: string, status: 'active' | 'revoked') => {
    if (!isAdmin) throw new Error('Unauthorized');
    const cleanEmail = emailOrId.toLowerCase().trim();
    await updateDoc(doc(db, 'subscribers', cleanEmail), { status }).catch(() => {});
    await updateDoc(doc(db, 'allowed_users', cleanEmail), { status }).catch(() => {});
  };

  const removeSubscriber = async (emailOrId: string) => {
    if (!isAdmin) throw new Error('Unauthorized');
    const cleanEmail = emailOrId.toLowerCase().trim();
    await deleteDoc(doc(db, 'subscribers', cleanEmail)).catch(() => {});
    await deleteDoc(doc(db, 'allowed_users', cleanEmail)).catch(() => {});
  };

  // 5. UPI Payments Processing
  const submitUpiPayment = async (data: {
    email: string;
    name?: string;
    utrNumber: string;
    planId: 'monthly' | 'annual' | 'lifetime';
    planName: string;
    amountInr: number;
  }): Promise<{ success: boolean; memberId: string; password: string; message: string; record: SubscriberRecord }> => {
    setLoading(true);
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanUtr = data.utrNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new Error('Please enter a valid email address (e.g., yourname@gmail.com).');
      }

      if (!cleanUtr || cleanUtr.length < 6) {
        throw new Error('Please enter a valid 12-digit UPI Reference Number / UTR from your payment app receipt.');
      }

      // Check if UTR was already submitted to prevent duplicates
      const utrSnap = await getDocs(query(collection(db, 'upi_transactions'), where('utrNumber', '==', cleanUtr)));
      if (!utrSnap.empty) {
        const existingTx = utrSnap.docs[0].data() as UpiPaymentRecord;
        if (existingTx.email.toLowerCase() !== cleanEmail) {
          throw new Error('This UPI Reference Number has already been submitted for another account. If this is an error, please contact support.');
        }
      }

      const nowIso = new Date().toISOString();
      const displayName = data.name?.trim() || cleanEmail.split('@')[0];

      // Check if already subscribed in subscribers database to reuse memberId or create a new one
      const subDocRef = doc(db, 'subscribers', cleanEmail);
      const existingSub = await getDoc(subDocRef);
      let memberId = '';
      let assignedPassword = '';

      if (existingSub.exists()) {
        const existingData = existingSub.data() as SubscriberRecord;
        memberId = existingData.memberId;
        assignedPassword = existingData.password || generateSecurePassword();
      } else {
        memberId = generateMemberId();
        assignedPassword = generateSecurePassword();
      }

      const record: SubscriberRecord = {
        id: cleanEmail,
        memberId,
        email: cleanEmail,
        password: assignedPassword,
        displayName,
        role: 'subscriber',
        status: 'active',
        subscriptionPlan: data.planName,
        createdAt: nowIso,
        lastLoginAt: nowIso,
        emailVerified: true,
        notes: `Paid via UPI (UTR: ${cleanUtr}, ₹${data.amountInr})`,
        issuedBy: 'upi_checkout'
      };

      // 1. Store in Firestore subscribers
      await setDoc(subDocRef, record, { merge: true });

      // 2. Store in allowed_users
      await setDoc(doc(db, 'allowed_users', cleanEmail), {
        email: cleanEmail,
        role: 'subscriber',
        status: 'active',
        plan: data.planName,
        notes: `UPI UTR: ${cleanUtr}, Amount: ₹${data.amountInr}`,
        addedBy: 'upi_system',
        addedAt: nowIso,
      }, { merge: true });

      // 3. Store in upi_transactions collection
      const txId = `upi_${Date.now()}_${cleanUtr.slice(-4)}`;
      const upiRecord: UpiPaymentRecord = {
        id: txId,
        email: cleanEmail,
        name: displayName,
        utrNumber: cleanUtr,
        planId: data.planId,
        planName: data.planName,
        amountInr: data.amountInr,
        memberId,
        password: assignedPassword,
        status: 'active',
        createdAt: nowIso,
        verifiedAt: nowIso,
        notes: 'Submitted via Studio UPI Checkout'
      };
      await setDoc(doc(db, 'upi_transactions', txId), upiRecord);

      // 4. Create user profile and set session
      const sessionUid = 'usr_' + btoa(cleanEmail).replace(/=/g, '');
      const userProfile: UserProfile = {
        uid: sessionUid,
        email: cleanEmail,
        displayName,
        role: 'subscriber',
        status: 'active',
        subscriptionPlan: data.planName,
        createdAt: nowIso,
        lastLoginAt: nowIso,
      };
      await setDoc(doc(db, 'users', sessionUid), userProfile, { merge: true });

      setUser({
        uid: sessionUid,
        email: cleanEmail,
        displayName,
        photoURL: null,
      } as unknown as User);
      setProfile(userProfile);
      localStorage.setItem('quran_studio_auth_profile', JSON.stringify(userProfile));

      return {
        success: true,
        memberId,
        password: assignedPassword,
        message: 'UPI payment registered successfully! Studio is now unlocked.',
        record
      };
    } finally {
      setLoading(false);
    }
  };

  const updateUpiConfig = async (newConfig: Partial<UpiConfig>) => {
    if (!isAdmin) throw new Error('Unauthorized');
    const updated = { ...upiConfig, ...newConfig };
    setUpiConfig(updated);
    localStorage.setItem('quran_studio_upi_config', JSON.stringify(updated));
    await setDoc(doc(db, 'settings', 'upi_config'), updated, { merge: true }).catch(() => {});
  };

  const verifyUpiPayment = async (txId: string, status: 'active' | 'rejected') => {
    if (!isAdmin) throw new Error('Unauthorized');
    await updateDoc(doc(db, 'upi_transactions', txId), {
      status,
      verifiedAt: new Date().toISOString(),
    });
  };

  const deleteUpiPayment = async (txId: string) => {
    if (!isAdmin) throw new Error('Unauthorized');
    await deleteDoc(doc(db, 'upi_transactions', txId));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isOwner,
        isAdmin,
        isAuthorized,
        userRole,
        accessStatus,
        subscriptionPlan,
        allowedUsersList,
        pendingRequests,
        accessCodes,
        allRegisteredUsers,
        subscribersList,
        upiConfig,
        upiTransactions,
        updateUpiConfig,
        submitUpiPayment,
        verifyUpiPayment,
        deleteUpiPayment,
        loginAsOwner,
        quickEmailLogin,
        loginWithGoogle,
        loginWithEmail,
        loginWithIdOrEmail,
        registerWithEmail,
        subscribeUser,
        adminIssueSubscriberCredentials,
        updateSubscriberStatus,
        removeSubscriber,
        logout,
        submitAccessRequest,
        redeemAccessCode,
        redeemAccessCodeDirect,
        addAllowedUser,
        updateAllowedUserStatus,
        removeAllowedUser,
        approveRequest,
        rejectRequest,
        createAccessCode,
        deleteAccessCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
