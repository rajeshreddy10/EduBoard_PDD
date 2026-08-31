"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { userProfileService } from "@/lib/services/firebaseData";
import { setUser as saveUserToStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { Camera, Trash2, Check, AlertCircle, Loader2, User as UserIcon } from 'lucide-react';

export default function ProfileSettings() {
  const { user, updateUserProfile } = useAuth();
  const [userState, setUserState] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [location, setLocation] = useState("");
  const [teachingPhilosophy, setTeachingPhilosophy] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchUserProfile() {
      try {
        const firestoreUser: any = await userProfileService.getProfile(user!.id);
        const combined = { ...user, ...firestoreUser };

        setUserState(combined as User);
        setName(combined.name || user?.email?.split('@')[0] || "");
        setUsername(combined.username || user?.email?.split('@')[0] || "");
        setBio(combined.bio || "");
        setPhone(combined.phone || "");
        setInstitution(combined.institution || "");
        setLocation(combined.location || "");
        setTeachingPhilosophy(combined.teachingPhilosophy || "");
        setDob(combined.dob || combined.dateOfBirth || "");
        setGender(combined.gender || "");
        setAvatarPreview(combined.avatar || null);
      } catch (err) {
        console.warn("Error loading profile from Firestore:", err);
      }
    }

    fetchUserProfile();
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a valid image (JPG, PNG, or WebP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image size should be less than 2MB");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setUploadError("Failed to read file");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const updatedData: any = {
      name,
      username,
      bio,
      phone,
      institution,
      location,
      teachingPhilosophy,
      dob,
      gender,
      avatar: avatarPreview
    };

    try {
      await userProfileService.updateProfile(user.id, updatedData);
      await updateUserProfile(updatedData);
      const updatedUser = { ...user, ...updatedData };
      saveUserToStore(updatedUser);
      setUserState(updatedUser);
      setSaved(true);
      window.dispatchEvent(new CustomEvent('profile-changed'));
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save profile updates:", err);
    }
  };

  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Profile Settings</h1>
        <p className="text-[var(--text-secondary)] text-sm">Update your personal information and profile picture</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Avatar Upload */}
        <div className="md:col-span-1">
          <div className="card p-6 flex flex-col items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-6 self-start">Profile Picture</h3>

            <div className="relative group">
              <div
                className="w-32 h-32 relative rounded-full border-4 border-[var(--border-primary)] overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center shadow-inner transition-transform group-hover:scale-[1.02]"
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar Preview"
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center text-[var(--text-tertiary)]">
                    <UserIcon className="w-12 h-12 mb-1" />
                    <span className="text-xl font-bold">{initials}</span>
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-[var(--color-primary-500)] text-white rounded-full shadow-lg hover:bg-[var(--color-primary-600)] transition-all cursor-pointer"
                title="Change picture"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div className="mt-6 flex flex-col gap-2 w-full">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary w-full text-xs font-bold uppercase tracking-wider py-2.5"
              >
                Upload New Image
              </button>
              {avatarPreview && (
                <button
                  onClick={handleRemoveAvatar}
                  className="btn btn-ghost w-full text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 py-2.5"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                </button>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-600 text-[10px] font-bold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <p className="mt-4 text-[10px] text-[var(--text-tertiary)] text-center">
              JPG, PNG or WebP. Max size 2MB.
            </p>
          </div>
        </div>

        {/* Right: Info Fields */}
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6 sm:p-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-6">Personal Details</h3>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Full Name</label>
                  <input className="input py-3 font-semibold" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Username</label>
                  <input className="input py-3 font-semibold" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. johndoe123" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Email Address</label>
                  <input className="input py-3 font-semibold opacity-60 cursor-not-allowed" value={user?.email || ''} disabled />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Phone Number</label>
                  <input className="input py-3 font-semibold" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Short Bio</label>
                <textarea
                  className="input py-3 min-h-[100px] resize-none"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us a little about yourself..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Institution / School</label>
                  <input className="input py-3 font-semibold" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Stanford University" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Location</label>
                  <input className="input py-3 font-semibold" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. San Francisco, CA" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Teaching Philosophy</label>
                <textarea
                  className="input py-3 min-h-[100px] resize-none"
                  value={teachingPhilosophy}
                  onChange={e => setTeachingPhilosophy(e.target.value)}
                  placeholder="What is your approach to teaching?"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Date of Birth</label>
                  <input className="input py-3 font-semibold" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Gender</label>
                  <select className="input py-3 font-semibold h-[46px]" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-[var(--border-primary)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {saved ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-black uppercase tracking-widest animate-fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>Changes Saved Successfully</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--text-tertiary)] italic">All changes are saved to your local profile and cloud sync.</p>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button className="btn btn-secondary flex-1 sm:flex-none py-3 px-8 text-xs font-bold uppercase tracking-widest">Cancel</button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary flex-1 sm:flex-none py-3 px-10 text-xs font-black uppercase tracking-[0.15em] shadow-lg shadow-indigo-500/20"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
