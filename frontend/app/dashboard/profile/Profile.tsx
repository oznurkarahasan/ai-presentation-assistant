'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDashboard } from '../DashboardContext';
import client from '@/app/api/client';

export default function Profile() {
	const router = useRouter();
	const { user, setAlert, refreshData, setActiveTab } = useDashboard();
	const [fullName, setFullName] = useState('');
	const [email, setEmail] = useState('');
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
	const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
	const [profileError, setProfileError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteStep, setDeleteStep] = useState<'warning' | 'password'>('warning');
	const [deletePassword, setDeletePassword] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (!user) return;
		setFullName(user.full_name || '');
		setEmail(user.email || '');
	}, [user]);

	const hasProfileChanges = user
		? fullName.trim() !== (user.full_name || '') || email.trim() !== (user.email || '')
		: false;

	if (!user) {
		return (
			<section className="mt-8 rounded-[2rem] border border-white/10 bg-[#0C0C0C] p-6 sm:p-8">
				<p className="text-sm text-zinc-400">Profile information is not available.</p>
			</section>
		);
	}

	const hasPasswordDraft = currentPassword || newPassword || confirmPassword;
	const currentPlan = 'Free Plan';

	const resetPasswordFields = () => {
		setCurrentPassword('');
		setNewPassword('');
		setConfirmPassword('');
		setPasswordError(null);
	};

	const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!hasProfileChanges || isUpdatingProfile) return;

		const normalizedName = fullName.trim();
		const normalizedEmail = email.trim();

		if (!normalizedName) {
			setProfileError('Full name cannot be empty.');
			return;
		}

		try {
			setIsUpdatingProfile(true);
			setProfileError(null);
			await client.patch('/api/v1/auth/me', {
				full_name: normalizedName,
				email: normalizedEmail,
			});

			await refreshData();
			setAlert({ type: 'info', message: 'Profile updated successfully.' });
			setTimeout(() => setAlert(null), 3500);
		} catch (error) {
			const apiMessage = axios.isAxiosError(error)
				? (error.response?.data?.detail as string | undefined)
				: undefined;
			setProfileError(apiMessage || 'Failed to update profile.');
		} finally {
			setIsUpdatingProfile(false);
		}
	};

	const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isUpdatingPassword) return;

		if (!currentPassword || !newPassword || !confirmPassword) {
			setPasswordError('Fill in all password fields.');
			return;
		}

		if (newPassword.length < 8) {
			setPasswordError('New password must be at least 8 characters.');
			return;
		}

		if (newPassword !== confirmPassword) {
			setPasswordError('New password and confirmation do not match.');
			return;
		}

		try {
			setIsUpdatingPassword(true);
			setPasswordError(null);
			await client.patch('/api/v1/auth/me', {
				current_password: currentPassword,
				password: newPassword,
				password_confirm: confirmPassword,
			});

			resetPasswordFields();
			setAlert({ type: 'info', message: 'Password updated successfully.' });
			setTimeout(() => setAlert(null), 3500);
		} catch (error) {
			const apiMessage = axios.isAxiosError(error)
				? (error.response?.data?.detail as string | undefined)
				: undefined;
			setPasswordError(apiMessage || 'Failed to update password.');
		} finally {
			setIsUpdatingPassword(false);
		}
	};

	const openDeleteModal = () => {
		setDeleteStep('warning');
		setDeletePassword('');
		setShowDeleteModal(true);
	};

	const closeDeleteModal = () => {
		if (isDeleting) return;
		setShowDeleteModal(false);
		setDeleteStep('warning');
		setDeletePassword('');
	};

	const handleDeleteAccount = async () => {
		if (!deletePassword.trim() || isDeleting) return;

		try {
			setIsDeleting(true);
			await client.request({
				method: 'DELETE',
				url: '/api/v1/auth/me',
				data: { password: deletePassword.trim() },
			});

			localStorage.removeItem('access_token');
			setAlert({ type: 'info', message: 'Account deleted successfully.' });
			setTimeout(() => setAlert(null), 3500);
			router.push('/login');
		} catch (error) {
			const apiMessage = axios.isAxiosError(error)
				? (error.response?.data?.detail as string | undefined)
				: undefined;
			setAlert({ type: 'error', message: apiMessage || 'Account deletion failed.' });
			setTimeout(() => setAlert(null), 3500);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
			<motion.section
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35 }}
			className="mt-8 space-y-6 rounded-[2rem] border border-white/10 bg-[#0C0C0C] p-4 sm:p-6 lg:p-8"
			>
				<div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
					<form onSubmit={handleUpdateProfile} className="rounded-2xl border border-white/10 bg-[#101010] p-4 sm:p-5">
						<div className="mb-4 flex items-start justify-between gap-4">
							<div>
								<h3 className="text-base font-bold text-white sm:text-lg">Profile Information</h3>
								<p className="mt-1 text-xs text-zinc-400 sm:text-sm">Keep your name and email up to date.</p>
							</div>
							<span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
								{user.is_active ? 'Active account' : 'Inactive account'}
							</span>
						</div>

						<div className="space-y-4">
							<div>
								<label htmlFor="profile-full-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Full Name</label>
								<input
									id="profile-full-name"
									type="text"
									value={fullName}
									onChange={(e) => setFullName(e.target.value)}
									autoComplete="name"
									className="w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary/70"
								/>
							</div>

							<div>
								<label htmlFor="profile-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Email</label>
								<input
									id="profile-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									autoComplete="email"
									className="w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary/70"
								/>
							</div>

							{profileError && (
								<p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300 sm:text-sm">{profileError}</p>
							)}

							<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
								<button
									type="button"
									onClick={() => {
										setFullName(user.full_name || '');
										setEmail(user.email || '');
										setProfileError(null);
									}}
									disabled={!hasProfileChanges || isUpdatingProfile}
									className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={!hasProfileChanges || isUpdatingProfile}
									className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isUpdatingProfile ? 'Saving...' : 'Save Changes'}
								</button>
							</div>
						</div>
					</form>

					<form onSubmit={handleUpdatePassword} className="rounded-2xl border border-white/10 bg-[#101010] p-4 sm:p-5">
						<h3 className="text-base font-bold text-white sm:text-lg">Security</h3>
						<p className="mt-1 text-xs text-zinc-400 sm:text-sm">Change your password regularly to keep your account secure.</p>

						<div className="mt-4 space-y-3">
							<div>
								<label htmlFor="current-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Current Password</label>
								<input
									id="current-password"
									type="password"
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									autoComplete="current-password"
									className="w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary/70"
								/>
							</div>
							<div>
								<label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">New Password</label>
								<input
									id="new-password"
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									autoComplete="new-password"
									className="w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary/70"
								/>
							</div>
							<div>
								<label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Confirm New Password</label>
								<input
									id="confirm-password"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									autoComplete="new-password"
									className="w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary/70"
								/>
							</div>

							{passwordError && (
								<p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300 sm:text-sm">{passwordError}</p>
							)}

							<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
								<button
									type="button"
									onClick={resetPasswordFields}
									disabled={!hasPasswordDraft || isUpdatingPassword}
									className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
								>
									Clear
								</button>
								<button
									type="submit"
									disabled={!hasPasswordDraft || isUpdatingPassword}
									className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isUpdatingPassword ? 'Updating...' : 'Update Password'}
								</button>
							</div>
						</div>
					</form>
				</div>

				<div className="border-t border-white/10 pt-5">
					<h3 className="text-base font-bold text-white sm:text-lg">Plan</h3>
					<p className="mt-1 text-xs text-zinc-400 sm:text-sm">Your current subscription and upgrade availability.</p>
					<div className="mt-3 rounded-xl border border-white/10 bg-[#101010] px-4 py-3">
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm font-bold text-zinc-100">{currentPlan}</p>
							<button
								type="button"
								onClick={() => setActiveTab('billing')}
								className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
							>
								Upgrade
							</button>
						</div>
					</div>
				</div>

				<div className="border-t border-white/10 pt-5">
					<h3 className="text-base font-bold text-white sm:text-lg">Danger Zone</h3>
					<p className="mt-1 text-xs text-zinc-400 sm:text-sm">Deleting your account permanently removes your data.</p>
					<button
						type="button"
						onClick={openDeleteModal}
						className="mt-3 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15"
					>
						Delete Account
					</button>
				</div>
			</motion.section>

			{showDeleteModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
					<div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#0C0C0C] p-5 sm:p-6">
						{deleteStep === 'warning' ? (
							<>
								<h3 className="text-lg font-bold text-white">Delete Account</h3>
								<p className="mt-2 text-sm text-zinc-300">
									This action cannot be undone. All your account data will be permanently deleted.
								</p>
								<div className="mt-5 grid grid-cols-2 gap-3">
									<button
										type="button"
										onClick={closeDeleteModal}
										className="rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.04]"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={() => setDeleteStep('password')}
										className="rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600"
									>
										I Understand
									</button>
								</div>
							</>
						) : (
							<>
								<h3 className="text-lg font-bold text-white">Confirm With Password</h3>
								<p className="mt-2 text-sm text-zinc-300">Enter your current password to permanently delete your account.</p>
								<input
									type="password"
									value={deletePassword}
									onChange={(e) => setDeletePassword(e.target.value)}
									autoFocus
									autoComplete="current-password"
									placeholder="Current password"
									className="mt-4 w-full rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white outline-none focus:border-red-400/70"
								/>
								<div className="mt-5 grid grid-cols-2 gap-3">
									<button
										type="button"
										onClick={closeDeleteModal}
										disabled={isDeleting}
										className="rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
									>
										Back
									</button>
									<button
										type="button"
										onClick={handleDeleteAccount}
										disabled={!deletePassword.trim() || isDeleting}
										className="rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{isDeleting ? 'Deleting...' : 'Delete Permanently'}
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</>
	);
}
