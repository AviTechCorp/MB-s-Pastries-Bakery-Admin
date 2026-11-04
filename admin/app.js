import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAuRwHUHDn5Nf-AhtNmo2ATITaRdiVJZnU",
  authDomain: "mb-s-pastries-and-bakery.firebaseapp.com",
  projectId: "mb-s-pastries-and-bakery",
  storageBucket: "mb-s-pastries-and-bakery.firebasestorage.app",
  messagingSenderId: "55184373579",
  appId: "1:55184373579:web:0eac0f989cdf1e4fc69ace",
  measurementId: "G-9W98RP182D"
};
const ADMIN_EMAIL = "mbspastriesandbakery@gmail.com";
const CUSTOMER_SITE_URL = "https://avitechcorp.github.io/MB-s-Pastries-Bakery/";
const SITE_ID = "mbs-pastries-and-bakery";
const DEFAULT_BULK = {
  scones: [
    {size: "3L", price: "R150", popular: false},
    {size: "5L", price: "R280", popular: true},
    {size: "10L", price: "R400", popular: false},
    {size: "20L", price: "R850", popular: false}
  ],
  biscuits: [
    {size: "2.5L", price: "R200", popular: false},
    {size: "5L", price: "R400", popular: true},
    {size: "10L", price: "R730", popular: false}
  ]
};
const DEFAULT_SINGLES = [
  {id: "1", name: "Traditional Dikuku", desc: "Scones - No Eggs", price: "R12", tag: "Heritage"},
  {id: "2", name: "Scones", desc: "Soft & fluffy - per pack", price: "R18", tag: "Best Seller"},
  {id: "3", name: "Jam Tart", desc: "Buttery crust, sweet jam", price: "R35", tag: "Fave"},
  {id: "4", name: "Muffin", desc: "Fresh daily", price: "R15", tag: ""},
  {id: "5", name: "Biscuits", desc: "Crunchy homemade - from", price: "R25", tag: "Bulk"},
  {id: "6", name: "6 Mini Doughnuts", desc: "Sugar glazed", price: "R30", tag: "Mini"},
  {id: "7", name: "Mixed Loaf Slices", desc: "Banana / vanilla mix", price: "R30", tag: "Loaf"}
];
const DEFAULT_GALLERY = [
  {id: "g1", src: "WhatsApp%20Image%202026-11-03%20at%2020.13.30.jpeg", title: "Crunchy Biscuits Batch", desc: "Golden, crisp, and baked with love.", category: "Biscuits", price: "from R25", featured: true},
  {id: "g2", src: "WhatsApp%20Image%202026-11-03%20at%2020.13.jpeg", title: "Fresh Muffins", desc: "A fresh batch from our kitchen.", category: "Muffins", price: "R15"},
  {id: "g3", src: "WhatsApp%20Image%202026-11-03%20at%2020.13.32.jpeg", title: "Chocolate Cake", desc: "Made for sharing and celebrating.", category: "Cakes", price: ""},
  {id: "g4", src: "WhatsApp%20Image%202026-11-03%20at%2020.13.31.jpeg", title: "Mb's Full Menu", desc: "Take a look at our menu.", category: "Menu", price: ""}
];
const DEFAULT_SETTINGS = {
  deliveryFee: "Extra fee depending on location",
  businessName: "Mb's Pastries & Bakery",
  phone: "079 820 2255",
  tiktok: "Mb'sPastries&Bakery"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const siteRef = doc(db, "sites", SITE_ID);
let siteData = {
  bulk: structuredClone(DEFAULT_BULK),
  singles: structuredClone(DEFAULT_SINGLES),
  gallery: DEFAULT_GALLERY.map(item => ({...item})),
  settings: {...DEFAULT_SETTINGS}
};
let inquiries = [];
let stopSiteListener;
let stopInquiryListener;
let toastTimer;
let creatingAccount = false;
let firebaseConnecting = false;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function notify(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 4000);
}

function reportError(action, error) {
  console.error(`${action} failed.`, error);
  notify(`${action} failed: ${error.message || "Check your Firebase setup and try again."}`);
}

function setConnectionStatus(message, state, canRetry = false) {
  const status = document.getElementById("connectionStatus");
  status.dataset.state = state;
  document.getElementById("connectionMessage").textContent = message;
  document.getElementById("retryConnection").classList.toggle("hidden", !canRetry);
}

function firebaseConnectionMessage(error) {
  if (error.code === "permission-denied") {
    return "You're signed in, but Firestore denied access. Deploy firestore.rules and confirm your admin email is verified.";
  }
  if (error.code === "failed-precondition") {
    return "Firestore needs setup. Create/enable the Firestore database in Firebase Console, then retry.";
  }
  if (error.code === "unavailable" || /client is offline|offline/i.test(error.message || "")) {
    return "You're signed in, but Firestore is unreachable. Check your internet and confirm a Firestore database exists in project mb-s-pastries-and-bakery.";
  }
  return `You're signed in, but Firebase could not load site data: ${error.message || error.code || "unknown error"}`;
}

function openDashboard() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  renderAll();
}

function showTab(name) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("hidden", panel.id !== `tab-${name}`));
  document.querySelectorAll(".tab-button").forEach(button => button.classList.toggle("active", button.dataset.tab === name));
  if (name === "orders") renderOrders();
  if (name === "settings") renderSettings();
  if (name === "gallery") renderGallery();
  if (name === "singles") renderTreats();
}

function renderOverview() {
  document.getElementById("metricBulk").textContent = siteData.bulk.scones.length + siteData.bulk.biscuits.length;
  document.getElementById("metricTreats").textContent = siteData.singles.length;
  document.getElementById("metricPhotos").textContent = siteData.gallery.length;
  document.getElementById("metricOrders").textContent = inquiries.length;
  document.getElementById("overviewBusiness").textContent = `${siteData.settings.phone} · ${siteData.settings.tiktok}`;
}

function renderBulk() {
  const container = document.getElementById("bulkEditor");
  container.replaceChildren();
  [["scones", "Plain Scones"], ["biscuits", "Biscuits"]].forEach(([key, title]) => {
    const group = el("section", "bulk-group");
    const header = el("div", "bulk-head");
    header.append(el("h3", "", title));
    const add = el("button", "button secondary small", "＋ Add size");
    add.type = "button";
    add.addEventListener("click", async () => {
      const bulk = structuredClone(siteData.bulk);
      bulk[key].push({size: "", price: "", popular: false});
      await saveField("bulk", bulk);
      renderBulk();
    });
    header.append(add);
    group.append(header);
    siteData.bulk[key].forEach((item, index) => {
      const row = el("div", "bulk-row");
      const size = el("input", "field");
      size.placeholder = "Size";
      size.value = item.size || "";
      size.dataset.key = key;
      size.dataset.index = index;
      size.dataset.field = "size";
      const price = el("input", "field");
      price.placeholder = "Price";
      price.value = item.price || "";
      price.dataset.key = key;
      price.dataset.index = index;
      price.dataset.field = "price";
      const popularLabel = el("label", "check");
      const popular = el("input");
      popular.type = "checkbox";
      popular.checked = Boolean(item.popular);
      popular.dataset.key = key;
      popular.dataset.index = index;
      popular.dataset.field = "popular";
      popularLabel.append(popular, document.createTextNode("Popular"));
      const remove = el("button", "button danger small", "Remove");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        const bulk = structuredClone(siteData.bulk);
        bulk[key].splice(index, 1);
        if (await saveField("bulk", bulk)) renderBulk();
      });
      row.append(size, price, popularLabel, remove);
      group.append(row);
    });
    container.append(group);
  });
}

async function saveBulk() {
  const bulk = structuredClone(siteData.bulk);
  document.querySelectorAll("#bulkEditor [data-field]").forEach(input => {
    const item = bulk[input.dataset.key][Number(input.dataset.index)];
    item[input.dataset.field] = input.type === "checkbox" ? input.checked : input.value.trim();
  });
  if (await saveField("bulk", bulk)) notify("Bulk prices published.");
}

function renderTreats() {
  const container = document.getElementById("treatList");
  container.replaceChildren();
  siteData.singles.forEach((item, index) => {
    const row = el("div", "treat-row");
    [["name", "Name", item.name], ["desc", "Description", item.desc], ["price", "Price", item.price], ["tag", "Tag", item.tag]].forEach(([key, placeholder, value]) => {
      const input = el("input", "field");
      input.placeholder = placeholder;
      input.value = value || "";
      input.dataset.field = key;
      input.dataset.index = index;
      row.append(input);
    });
    const remove = el("button", "button danger small", "Delete");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      const treats = siteData.singles.filter((_, itemIndex) => itemIndex !== index);
      if (await saveField("singles", treats)) renderTreats();
    });
    row.append(remove);
    container.append(row);
  });
  if (!container.childElementCount) container.append(el("div", "empty", "No treats yet. Add one above to show it on the customer page."));
}

async function saveTreatFields() {
  const treats = structuredClone(siteData.singles);
  document.querySelectorAll("#treatList [data-field]").forEach(input => {
    treats[Number(input.dataset.index)][input.dataset.field] = input.value.trim();
  });
  if (await saveField("singles", treats)) notify("Treat menu published.");
}

async function addTreat() {
  const name = document.getElementById("newTreatName").value.trim();
  const price = document.getElementById("newTreatPrice").value.trim();
  if (!name || !price) {
    notify("Please enter a treat name and price.");
    return;
  }
  const treats = [...siteData.singles, {
    id: crypto.randomUUID(),
    name,
    price,
    desc: document.getElementById("newTreatDesc").value.trim(),
    tag: document.getElementById("newTreatTag").value.trim()
  }];
  if (!await saveField("singles", treats)) return;
  ["newTreatName", "newTreatPrice", "newTreatDesc", "newTreatTag"].forEach(id => document.getElementById(id).value = "");
  renderTreats();
  notify("Treat published to the customer menu.");
}

function renderGallery() {
  const container = document.getElementById("galleryList");
  container.replaceChildren();
  siteData.gallery.forEach((photo, index) => {
    const card = el("article", "gallery-card");
    const image = el("img");
    image.src = photo.src && !/^(data:|blob:|https?:)/i.test(photo.src)
      && !CUSTOMER_SITE_URL.startsWith("REPLACE_")
      ? new URL(photo.src, `${CUSTOMER_SITE_URL.replace(/\/+$/, "")}/`).href
      : photo.src || "";
    image.alt = photo.title || "Bakery photo";
    image.loading = "lazy";
    card.append(image);
    const copy = el("div", "gallery-copy");
    const title = el("h3", "", photo.title || "Untitled bake");
    if (photo.featured) title.append(document.createTextNode(" "), el("span", "featured", "FEATURED"));
    copy.append(title);
    copy.append(el("p", "", [photo.category, photo.price, photo.desc].filter(Boolean).join(" · ") || "No details added."));
    const actions = el("div", "gallery-actions");
    const feature = el("button", "button secondary small", photo.featured ? "Unfeature" : "Feature");
    feature.type = "button";
    feature.addEventListener("click", async () => {
      const photos = structuredClone(siteData.gallery);
      photos[index].featured = !photos[index].featured;
      if (await saveField("gallery", photos)) renderGallery();
    });
    const remove = el("button", "button danger small", "Delete");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!window.confirm("Delete this bake photo from the customer gallery?")) return;
      const photos = structuredClone(siteData.gallery);
      const [deleted] = photos.splice(index, 1);
      if (await saveField("gallery", photos)) {
        if (deleted.storagePath) {
          try {
            await deleteObject(ref(storage, deleted.storagePath));
          } catch (error) {
            console.warn("Gallery record deleted, but its storage file could not be removed.", error);
          }
        }
        renderGallery();
        notify("Photo removed from the customer gallery.");
      }
    });
    actions.append(feature, remove);
    copy.append(actions);
    card.append(copy);
    container.append(card);
  });
  if (!container.childElementCount) container.append(el("div", "empty", "Your gallery is empty. Add a photo above."));
}

function renderOrders() {
  const container = document.getElementById("inquiryList");
  container.replaceChildren();
  if (!inquiries.length) {
    container.append(el("div", "empty", "No order enquiries yet."));
    return;
  }
  inquiries.forEach(inquiry => {
    const card = el("article", "inquiry");
    const details = el("div");
    details.append(el("h3", "", `${inquiry.qty || 1} × ${inquiry.product || "Order enquiry"}`));
    const date = inquiry.createdAt?.toDate ? inquiry.createdAt.toDate().toLocaleString() : "Just received";
    details.append(el("p", "", `${date}${inquiry.note ? `\n${inquiry.note}` : ""}`));
    const remove = el("button", "button danger small", "Remove");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "inquiries", inquiry.id));
        notify("Enquiry removed.");
      } catch (error) {
        reportError("Removing enquiry", error);
      }
    });
    card.append(details, remove);
    container.append(card);
  });
}

function renderSettings() {
  document.getElementById("settingName").value = siteData.settings.businessName || "";
  document.getElementById("settingPhone").value = siteData.settings.phone || "";
  document.getElementById("settingTikTok").value = siteData.settings.tiktok || "";
  document.getElementById("settingDelivery").value = siteData.settings.deliveryFee || "";
}

function renderAll() {
  renderOverview();
  renderBulk();
  renderTreats();
  renderGallery();
  renderOrders();
  renderSettings();
}

async function saveField(key, value) {
  try {
    await updateDoc(siteRef, { [key]: value, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    reportError("Publishing changes", error);
    return false;
  }
}

async function uploadNewPhoto() {
  const file = document.getElementById("galleryFile").files[0];
  const title = document.getElementById("galleryTitle").value.trim();
  if (!file || !title) {
    notify("Choose a photo and add a title.");
    return;
  }
  if (!file.type.startsWith("image/")) {
    notify("Please choose an image file.");
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    notify("That image is too large. Choose a file under 4 MB.");
    return;
  }
  const id = crypto.randomUUID();
  const storagePath = `gallery/${id}/${file.name.replace(/[^\w.-]/g, "_")}`;
  try {
    const uploaded = await uploadBytes(ref(storage, storagePath), file, {contentType: file.type});
    const src = await getDownloadURL(uploaded.ref);
    const photo = {
      id,
      src,
      storagePath,
      title,
      desc: document.getElementById("galleryDesc").value.trim(),
      category: document.getElementById("galleryCategory").value.trim() || "Fresh Bakes",
      price: document.getElementById("galleryPrice").value.trim(),
      date: new Date().toISOString(),
      featured: false
    };
    if (!await saveField("gallery", [photo, ...siteData.gallery])) {
      await deleteObject(ref(storage, storagePath));
      return;
    }
    ["galleryFile", "galleryTitle", "galleryDesc", "galleryCategory", "galleryPrice"].forEach(id => document.getElementById(id).value = "");
    notify("Photo published to the customer gallery.");
  } catch (error) {
    reportError("Uploading photo", error);
  }
}

async function saveSettings() {
  const settings = {
    businessName: document.getElementById("settingName").value.trim() || DEFAULT_SETTINGS.businessName,
    phone: document.getElementById("settingPhone").value.trim() || DEFAULT_SETTINGS.phone,
    tiktok: document.getElementById("settingTikTok").value.trim(),
    deliveryFee: document.getElementById("settingDelivery").value.trim() || DEFAULT_SETTINGS.deliveryFee
  };
  if (await saveField("settings", settings)) notify("Business details published.");
}

function listenToSite() {
  stopSiteListener?.();
  stopSiteListener = onSnapshot(siteRef, {includeMetadataChanges: true}, snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      siteData = {
        bulk: data.bulk || structuredClone(DEFAULT_BULK),
        singles: Array.isArray(data.singles) ? data.singles : structuredClone(DEFAULT_SINGLES),
        gallery: Array.isArray(data.gallery) ? data.gallery : DEFAULT_GALLERY.map(item => ({...item})),
        settings: {...DEFAULT_SETTINGS, ...(data.settings || {})}
      };
      renderAll();
    }
    if (snapshot.metadata.fromCache) {
      setConnectionStatus("Showing cached content. Waiting for a live Firestore connection…", "connecting", true);
    } else {
      setConnectionStatus("Connected to Firebase. Changes publish live across devices.", "connected");
    }
  }, error => {
    setConnectionStatus(firebaseConnectionMessage(error), "error", true);
    reportError("Loading published site data", error);
  });
}

function listenToInquiries() {
  stopInquiryListener?.();
  const inquiriesQuery = query(collection(db, "inquiries"), orderBy("createdAt", "desc"), limit(50));
  stopInquiryListener = onSnapshot(inquiriesQuery, snapshot => {
    inquiries = snapshot.docs.map(item => ({id: item.id, ...item.data()}));
    renderOrders();
    renderOverview();
  }, error => {
    setConnectionStatus(firebaseConnectionMessage(error), "error", true);
    reportError("Loading order enquiries", error);
  });
}

async function startAdminSession(user) {
  document.getElementById("loginError").classList.add("hidden");
  if ((user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    await signOut(auth);
    document.getElementById("loginError").textContent = "This account is not authorized to manage this site.";
    document.getElementById("loginError").classList.remove("hidden");
    return;
  }
  if (!user.emailVerified) {
    await signOut(auth);
    const errorLabel = document.getElementById("loginError");
    errorLabel.textContent = "Verify your admin email using the link we sent before signing in.";
    errorLabel.classList.remove("hidden");
    return;
  }
  if (ADMIN_EMAIL.startsWith("REPLACE_")) {
    await signOut(auth);
    document.getElementById("loginError").textContent = "Set the admin email in app.js and firestore.rules before signing in.";
    document.getElementById("loginError").classList.remove("hidden");
    return;
  }
  openDashboard();
  const customerLink = document.querySelector('a[href="../customer/customer.html"]');
  customerLink.href = CUSTOMER_SITE_URL;
  await connectToFirebase();
}

async function connectToFirebase() {
  if (firebaseConnecting || !auth.currentUser?.emailVerified) return;
  firebaseConnecting = true;
  setConnectionStatus("Signed in. Connecting to Firebase…", "connecting");
  try {
    const snapshot = await getDoc(siteRef);
    if (!snapshot.exists()) {
      await setDoc(siteRef, {
        bulk: DEFAULT_BULK,
        singles: DEFAULT_SINGLES,
        gallery: DEFAULT_GALLERY,
        settings: DEFAULT_SETTINGS,
        updatedAt: serverTimestamp()
      });
    }
    listenToSite();
    listenToInquiries();
  } catch (error) {
    setConnectionStatus(firebaseConnectionMessage(error), "error", true);
    reportError("Connecting to Firebase", error);
  } finally {
    firebaseConnecting = false;
  }
}

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const errorLabel = document.getElementById("loginError");
  errorLabel.classList.add("hidden");
  const email = document.getElementById("emailInput").value.trim().toLowerCase();
  const password = document.getElementById("passwordInput").value;
  try {
    if (email !== ADMIN_EMAIL.toLowerCase()) {
      errorLabel.textContent = `Only ${ADMIN_EMAIL} can create or use the admin account.`;
      errorLabel.classList.remove("hidden");
      return;
    }
    if (creatingAccount) {
      if (password.length < 12) {
        errorLabel.textContent = "Use a password with at least 12 characters.";
        errorLabel.classList.remove("hidden");
        return;
      }
      if (password !== document.getElementById("confirmPasswordInput").value) {
        errorLabel.textContent = "The passwords do not match.";
        errorLabel.classList.remove("hidden");
        return;
      }
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      await signOut(auth);
      errorLabel.textContent = `Verification email sent to ${ADMIN_EMAIL}. Verify your email, then sign in.`;
      errorLabel.classList.remove("hidden");
      document.getElementById("passwordInput").value = "";
      document.getElementById("confirmPasswordInput").value = "";
      document.getElementById("toggleCreateAccount").click();
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Firebase sign-in failed.", error);
    errorLabel.textContent = error.code === "auth/configuration-not-found"
      ? "Email/Password sign-in is not enabled for this Firebase project yet."
      : error.code === "auth/email-already-in-use"
        ? "An account already exists for this email. Sign in, or use Firebase Authentication to recover access."
      : "Sign-in failed. Check your email, password, and Firebase Authentication setup.";
    errorLabel.classList.remove("hidden");
  }
});

document.getElementById("toggleCreateAccount").addEventListener("click", () => {
  creatingAccount = !creatingAccount;
  const confirm = document.getElementById("confirmPasswordInput");
  const submit = document.getElementById("authSubmit");
  const toggle = document.getElementById("toggleCreateAccount");
  const password = document.getElementById("passwordInput");
  password.autocomplete = creatingAccount ? "new-password" : "current-password";
  confirm.classList.toggle("hidden", !creatingAccount);
  confirm.required = creatingAccount;
  submit.textContent = creatingAccount ? "Create account & send verification" : "Sign in";
  toggle.textContent = creatingAccount ? "Back to sign in" : "Create admin account";
  document.getElementById("loginError").classList.add("hidden");
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  try {
    stopSiteListener?.();
    stopInquiryListener?.();
    await signOut(auth);
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
  } catch (error) {
    reportError("Signing out", error);
  }
});
document.getElementById("retryConnection").addEventListener("click", () => void connectToFirebase());
document.querySelectorAll(".tab-button").forEach(button => button.addEventListener("click", () => showTab(button.dataset.tab)));
document.querySelectorAll("[data-open-tab]").forEach(button => button.addEventListener("click", () => showTab(button.dataset.openTab)));
document.getElementById("saveBulk").addEventListener("click", saveBulk);
document.getElementById("addTreat").addEventListener("click", addTreat);
document.getElementById("treatList").addEventListener("change", saveTreatFields);
document.getElementById("addPhoto").addEventListener("click", uploadNewPhoto);
document.getElementById("saveSettings").addEventListener("click", saveSettings);
document.getElementById("clearOrders").addEventListener("click", async () => {
  if (!inquiries.length || !window.confirm("Clear all saved order enquiries?")) return;
  try {
    await Promise.all(inquiries.map(inquiry => deleteDoc(doc(db, "inquiries", inquiry.id))));
    notify("Order enquiries cleared.");
  } catch (error) {
    reportError("Clearing enquiries", error);
  }
});
onAuthStateChanged(auth, user => {
  if (user && !creatingAccount) void startAdminSession(user);
});
