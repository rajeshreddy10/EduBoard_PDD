'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, User as UserIcon, Mail, School, Calendar, Users,
  Camera, CheckCircle, Save, X, Sparkles, BookOpen, ShieldCheck,
  Phone, MapPin, Loader2, AlertCircle, Edit3, Trash2
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { userProfileService } from '@/lib/services/firebaseData';
import { updateProfile as updateLocalStoreProfile } from '@/lib/store';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/app/dashboard/layout';

interface UserProfileData {
  name: string;
  email: string;
  institution: string;
  dateOfBirth: string;
  gender: string;
  avatarUrl: string | null;
  bio: string;
  phone: string;
  location: string;
  teachingPhilosophy: string;
  stats: { boards: number; interactions: number };
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ProfileContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, updateUserProfile } = useAuth();

  const [profile, setProfile] = useState<UserProfileData>({
    name: user?.name || user?.email?.split('@')[0] || '',
    email: user?.email || '',
    institution: user?.institution || '',
    dateOfBirth: '',
    gender: '',
    avatarUrl: user?.avatar || null,
    bio: '',
    phone: '',
    location: '',
    teachingPhilosophy: '',
    stats: { boards: 0, interactions: 0 },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<UserProfileData>(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    async function loadUserProfile() {
      try {
        setIsLoading(true);
        const firestoreUser: any = await userProfileService.getProfile(user!.id);
        const data: UserProfileData = {
          name: firestoreUser?.name || user?.name || user?.email?.split('@')[0] || 'User',
          email: user?.email || firestoreUser?.email || '',
          institution: firestoreUser?.institution || user?.institution || '',
          dateOfBirth: firestoreUser?.dob || firestoreUser?.dateOfBirth || '',
          gender: firestoreUser?.gender || '',
          avatarUrl: firestoreUser?.avatar || user?.avatar || null,
          bio: firestoreUser?.bio || '',
          phone: firestoreUser?.phone || '',
          location: firestoreUser?.location || '',
          teachingPhilosophy: firestoreUser?.teachingPhilosophy || '',
          stats: {
            boards: firestoreUser?.stats?.boards || 0,
            interactions: firestoreUser?.stats?.interactions || 0,
          },
        };
        setProfile(data);
        setFormData(data);
      } catch (err) {
        console.warn('Failed to load profile from Firestore:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserProfile();
  }, [user]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: 'Image size must be less than 5MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setFormData(prev => ({ ...prev, avatarUrl: result }));
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.avatar;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, avatarUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      await userProfileService.updateProfile(user.id, {
        name: formData.name,
        email: formData.email,
        institution: formData.institution,
        dob: formData.dateOfBirth,
        gender: formData.gender,
        avatar: formData.avatarUrl || undefined,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        teachingPhilosophy: formData.teachingPhilosophy,
      } as any);

      await updateUserProfile({
        name: formData.name,
        institution: formData.institution,
        avatar: formData.avatarUrl || undefined,
      });

      updateLocalStoreProfile({
        fullName: formData.name,
        email: formData.email,
        institution: formData.institution,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        avatarUrl: formData.avatarUrl || undefined,
        bio: formData.bio,
      });

      setProfile(formData);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setSaveError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setErrors({});
    setSaveError(null);
    setIsEditing(false);
  };

  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'U';
    return nameStr
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8 animate-fade-in">
      
      {/* Header Navigation */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">Account Profile</h1>
            <p className="text-xs text-[var(--text-tertiary)] font-medium">Manage your personal information and preferences</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 shadow-xs">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Profile Saved
            </span>
          )}

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] text-white transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all border border-[var(--border-primary)] disabled:opacity-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Save Error or File Size Warning Banner */}
      {(saveError || errors.avatar) && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError || errors.avatar}</span>
        </div>
      )}

      {/* Main Profile Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar Upload Dropzone & Quick Stats */}
        <section className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs flex flex-col items-center text-center">
            
            {/* Avatar Circle with Hover Edit State */}
            <div className="relative group mb-4">
              <div className="w-28 h-28 relative rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-xs border border-[var(--border-primary)]">
                {(isEditing ? formData.avatarUrl : profile.avatarUrl) ? (
                  <Image
                    src={(isEditing ? formData.avatarUrl : profile.avatarUrl) || ''}
                    alt={profile.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span>{getInitials(isEditing ? formData.name : profile.name)}</span>
                )}
              </div>

              {/* Edit Mode Camera Dropzone Overlay */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`absolute inset-0 rounded-full bg-slate-900/70 text-white flex flex-col items-center justify-center cursor-pointer transition-opacity ${
                  isEditing ? 'opacity-100 hover:opacity-90' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Change profile picture"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-semibold">Upload Photo</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Avatar Actions */}
            {(isEditing ? formData.avatarUrl : profile.avatarUrl) && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="mb-3 text-[11px] font-semibold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Remove Picture
              </button>
            )}

            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{profile.name}</h2>
              <p className="text-xs text-[var(--text-tertiary)] font-medium mt-0.5">{profile.institution || 'EduBoard Member'}</p>
            </div>

            <div className="w-full mt-4 pt-4 border-t border-[var(--border-primary)] flex justify-center">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Profile
              </span>
            </div>
          </div>

          {/* Quick Workspace Stats */}
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Saved Boards', value: profile.stats.boards, icon: BookOpen, color: 'text-blue-500' },
              { label: 'AI Interactions', value: profile.stats.interactions, icon: Sparkles, color: 'text-emerald-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-[var(--bg-tertiary)] ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{label}</span>
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)]">{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Editable Profile Details */}
        <section className="lg:col-span-2 space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs space-y-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-primary)]">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-[var(--color-primary-500)]" /> Account Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[var(--color-primary-500)]" /> Full Name
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]"
                      placeholder="Full name"
                    />
                    {errors.name && <p className="text-[10px] text-red-500 font-medium mt-1">{errors.name}</p>}
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-[var(--text-primary)] p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                    {profile.name || 'Not provided'}
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--color-primary-500)]" /> Email Address
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]"
                      placeholder="name@school.edu"
                    />
                    {errors.email && <p className="text-[10px] text-red-500 font-medium mt-1">{errors.email}</p>}
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-[var(--text-primary)] p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                    {profile.email || 'Not provided'}
                  </div>
                )}
              </div>

              {/* Institution */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-[var(--color-primary-500)]" /> Organization / Institution
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={e => setFormData({ ...formData, institution: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]"
                    placeholder="School or organization name"
                  />
                ) : (
                  <div className="text-xs font-semibold text-[var(--text-primary)] p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                    {profile.institution || 'Not specified'}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[var(--color-primary-500)]" /> Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]"
                    placeholder="+1 (555) 000-0000"
                  />
                ) : (
                  <div className="text-xs font-semibold text-[var(--text-primary)] p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                    {profile.phone || 'Not provided'}
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-primary-500)]" /> Location
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]"
                    placeholder="City, Country"
                  />
                ) : (
                  <div className="text-xs font-semibold text-[var(--text-primary)] p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                    {profile.location || 'Not provided'}
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Bio & Work Notes
                </label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)] resize-none"
                    placeholder="Share information about your work..."
                  />
                ) : (
                  <p className="text-xs text-[var(--text-secondary)] p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] leading-relaxed font-medium">
                    {profile.bio || 'No bio provided yet.'}
                  </p>
                )}
              </div>

            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
