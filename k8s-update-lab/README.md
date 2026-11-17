# 🚀 Kubernetes Update Strategy & Pod Resilience Lab

এই ল্যাবটি বিশেষভাবে তৈরি করা হয়েছে Kubernetes-এ **Update Strategy (RollingUpdate vs Recreate)**, **Manual Pod Deletion (Self-Healing)**, **Canary/Pause-Resume**, এবং **Rollback** প্র্যাকটিস করার জন্য।

---

## 📁 প্রজেক্ট স্ট্রাকচার

```text
k8s-update-lab/
├── manifests/
│   ├── 00-namespace.yaml             # k8s-lab namespace
│   ├── 01-service.yaml               # NodePort & ClusterIP Service
│   ├── 02-configmap-app.yaml         # Node.js Interactive Web App Source
│   ├── 03-deployment-v1-rolling.yaml # v1 (Blue) with RollingUpdate (Zero-Downtime)
│   ├── 04-deployment-v2-rolling.yaml # v2 (Green) with RollingUpdate
│   ├── 05-deployment-recreate.yaml   # Deployment with Recreate strategy (Downtime Demo)
│   └── 06-deployment-broken.yaml     # Broken release to test Rollback
├── scripts/
│   ├── test-traffic.ps1              # PowerShell live traffic tester
│   └── test-traffic.sh               # Bash live traffic tester
├── app/
│   ├── server.js                     # Source code (Node.js)
│   ├── package.json
│   └── Dockerfile                    # Optional: Docker build if needed
└── README.md
```

> **বিশেষ সুবিধা:** কোনো Docker image build বা push করার দরকার নেই! অফিসিয়াল `node:20-alpine` ইমেজ ব্যবহার করে ConfigMap দিয়ে সরাসরি কোড রান করবে।

---

## 🛠️ Step 0: ল্যাব ইনিশিয়ালাইজেশন ও অ্যাপ রান করা

টার্মিনাল ওপেন করে প্রজেক্ট ফোল্ডারে যান:

```powershell
# ১. Namespace তৈরি করুন
kubectl apply -f manifests/00-namespace.yaml

# ২. Service তৈরি করুন
kubectl apply -f manifests/01-service.yaml

# ৩. অ্যাপের কোড (ConfigMap) ডিপ্লয় করুন
kubectl apply -f manifests/02-configmap-app.yaml

# ৪. Version 1 (Blue) ডিপ্লয় করুন (RollingUpdate Strategy)
kubectl apply -f manifests/03-deployment-v1-rolling.yaml
```

### অ্যাপ এক্সেস করুন (Port-Forwarding)
একটি নতুন টার্মিনালে রান করুন:
```powershell
kubectl port-forward -n k8s-lab svc/demo-service 8080:80
```
এখন ব্রাউজারে ওপেন করুন: **[http://localhost:8080](http://localhost:8080)**  
এখানে একটি সুন্দর ড্যাশবোর্ড দেখতে পাবেন যা রিয়েল-টাইমে কোন Pod এবং কোন Version রিকোয়েস্ট হ্যান্ডেল করছে তা দেখাবে।

---

## 🧪 ল্যাব এক্সপেরিমেন্টসমূহ (Hands-on Experiments)

### 🎯 Experiment 1: Zero-Downtime Rolling Update (v1 ➔ v2)
Kubernetes-এর ডিফল্ট স্ট্র্যাটেজি হলো `RollingUpdate`। এখানে `maxSurge: 1` এবং `maxUnavailable: 0` কনফিগার করা আছে।

1. **Traffic Generator চালু করুন:**  
   আরেকটি টার্মিনালে持续 ট্রাফিক জেনারেটর রান করুন:
   ```powershell
   # Windows PowerShell (ExecutionPolicy Bypass সহ):
   powershell -ExecutionPolicy Bypass -File .\scripts\test-traffic.ps1

   # অথবা Linux / Mac / Git Bash:
   bash ./scripts/test-traffic.sh
   ```
   (এটি প্রতি ৪০০ মিলিসেকেন্ডে রিকোয়েস্ট পাঠাবে এবং কোন Pod রেসপন্স দিচ্ছে তা প্রিন্ট করবে)

2. **Pod-গুলো লাইভ ওয়াচ করুন:**  
   আরেকটি টার্মিনালে:
   ```powershell
   kubectl get pods -n k8s-lab -w
   ```

3. **v2 (Green) ডিপ্লয় করুন:**
   ```powershell
   kubectl apply -f manifests/04-deployment-v2-rolling.yaml
   ```

4. **ফলাফল পর্যবেক্ষণ করুন:**
   - ট্রাফিক জেনারেটরে লক্ষ্য করুন: **একটিও রিকোয়েস্ট ফেইল করবে না (0 Drops)!**
   - প্রথমে নতুন ১টি v2 Pod তৈরি হবে (`maxSurge: 1`)।
   - v2 Pod-টি Ready হওয়ার পর ট্রাফিক v1 এবং v2 এর মধ্যে শেয়ার হবে।
   - আস্তে আস্তে পুরনো v1 Pod ডিলিট হবে এবং নতুন v2 Pod জায়গা নিবে।

---

### 🎯 Experiment 2: ম্যানুয়ালি Pod Delete করা (Self-Healing & Resilience Test)
Kubernetes ReplicaSet কীভাবে নোড বা পড ক্র্যাশ হ্যান্ডেল করে তা পরীক্ষা করুন।

1. ট্রাফিক স্ক্রিপ্ট চালু রাখুন (`.\scripts\test-traffic.ps1`)।
2. রানিং পডগুলোর নাম দেখুন:
   ```powershell
   kubectl get pods -n k8s-lab
   ```
3. যেকোনো একটি পড ম্যানুয়ালি ডিলিট করে দিন:
   ```powershell
   kubectl delete pod <pod-name-from-above> -n k8s-lab
   ```
4. **ফলাফল:**
   - সাথে সাথে ReplicaSet একটি নতুন পড তৈরি করবে।
   - সার্ভিস স্বয়ংক্রিয়ভাবে ট্রাফিক অন্যান্য সচল পডগুলোতে পাঠিয়ে দেবে।
   - ট্রাফিক স্ক্রিপ্টে কোনো ডাউনটাইম দেখতে পাবেন না!

*(ব্রাউজার ড্যাশবোর্ডে থাকা `💥 Crash Pod (/kill)` বাটনে ক্লিক করেও আপনি পড ক্র্যাশ করাতে পারেন!)*

---

### 🎯 Experiment 3: Recreate Strategy বনাম RollingUpdate (Downtime দেখা)
`Recreate` স্ট্র্যাটেজিতে কুবারনেটিস সব পুরনো পড একসাথে বন্ধ করে দেয়, তারপর নতুন পড তৈরি করে।

1. Recreate Deployment অ্যাপ্লাই করুন:
   ```powershell
   kubectl apply -f manifests/05-deployment-recreate.yaml
   ```
2. ট্রাফিক স্ক্রিপ্ট চালু রাখুন।
3. রোলআউট রিস্টার্ট দিন:
   ```powershell
   kubectl rollout restart deployment/demo-app -n k8s-lab
   ```
4. **ফলাফল:**
   - ট্রাফিক স্ক্রিপ্টে লাল রঙে **`[DOWNTIME DROP]`** দেখতে পাবেন!
   - কারণ পুরনো পডগুলো একসাথে Terminate হয়ে গেছে এবং নতুন পড Ready হতে কয়েক সেকেন্ড সময় নিচ্ছে।

---

### 🎯 Experiment 4: Canary / Pause & Resume Rollout
রোলআউট মাঝপথে থামিয়ে কিছু ট্রাফিক নতুন ভার্সনে এবং বাকি ট্রাফিক পুরনো ভার্সনে টেস্ট করা যায়।

1. v1 এ ব্যাক করুন:
   ```powershell
   kubectl apply -f manifests/03-deployment-v1-rolling.yaml
   ```
2. v2 আপডেট শুরু করুন এবং তাৎক্ষণিক Pause করুন:
   ```powershell
   kubectl apply -f manifests/04-deployment-v2-rolling.yaml
   kubectl rollout pause deployment/demo-app -n k8s-lab
   ```
3. এবার `kubectl get pods -n k8s-lab` দিন:
   - দেখবেন ১টি বা ২টি পড v2 এবং বাকি পডগুলো এখনো v1!
   - ট্রাফিক স্ক্রিপ্টেও দেখবেন কিছু রিকোয়েস্ট v1-এ এবং কিছু v2-তে যাচ্ছে!
4. সবকিছু ঠিক থাকলে বাকি রোলআউট সম্পন্ন করুন:
   ```powershell
   kubectl rollout resume deployment/demo-app -n k8s-lab
   ```

---

### 🎯 Experiment 5: Broken Release & Rollback (`kubectl rollout undo`)
যদি ভুলবশত খারাপ কোনো কোড বা ফেইলিং কনফিগ ডিপ্লয় হয়, কুবারনেটিস কীভাবে প্রোটেক্ট করে?

1. ত্রুটিযুক্ত v3 ডিপ্লয় করুন (যার readiness probe ইচ্ছাকৃতভাবে ফেইল করানো):
   ```powershell
   kubectl apply -f manifests/06-deployment-broken.yaml
   ```
2. রোলআউট স্ট্যাটাস চেক করুন:
   ```powershell
   kubectl rollout status deployment/demo-app -n k8s-lab
   ```
   - দেখবেন রোলআউট আটকে গেছে (`Waiting for deployment "demo-app" rollout to finish...`)।
3. ট্রাফিক স্ক্রিপ্ট চেক করুন:
   - ব্যবহারকারীদের সার্ভিস **ডাউন হয়নি!** কারণ নতুন খারাপ পড Ready না হওয়া পর্যন্ত কুবারনেটিস পুরনো সুস্থ পডগুলোকে কিল করে না!
4. এবার রোলআউট বাতিল করে আগের সুস্থ ভার্সনে ফিরে যান (Instant Rollback):
   ```powershell
   # হিস্ট্রি দেখুন
   kubectl rollout history deployment/demo-app -n k8s-lab

   # পূর্বের ভার্সনে রোলব্যাক করুন
   kubectl rollout undo deployment/demo-app -n k8s-lab
   ```

---

## 🧹 ল্যাব ক্লিনআপ (Cleanup)

সব পরীক্ষা শেষ হয়ে গেলে ক্লাস্টার থেকে সবকিছু মুছে ফেলতে:
```powershell
kubectl delete namespace k8s-lab
```
