'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDashboard } from '../DashboardContext';
import client from '@/app/api/client';

function ProfileListRow({ label, value }: { label: string; value: string }) {
	return (
		<li className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
			<span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</span>
			<span className="text-sm font-semibold text-zinc-100 sm:text-base">{value}</span>
		</li>
	);
}

export default function Profile() {
	const router = useRouter();
	const { user, setAlert } = useDashboard();
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteStep, setDeleteStep] = useState<'warning' | 'password'>('warning');
	const [deletePassword, setDeletePassword] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);

	if (!user) {
		return (
			<section className="mt-8 rounded-[2rem] border border-white/10 bg-[#0C0C0C] p-6 sm:p-8">
				<p className="text-sm text-zinc-400">Profile information is not available.</p>
			</section>
		);
	}

	const profileItems = [
		{ label: 'Full Name', value: user.full_name?.trim() || 'Not provided' },
		{ label: 'Email', value: user.email || 'Not provided' },
		{ label: 'Password', value: '***' },
		{ label: 'Plan', value: 'Free Plan' },
	];

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
			className="mt-8 rounded-[2rem] border border-white/10 bg-[#0C0C0C] p-6 sm:p-8"
			>
				<ul className="divide-y divide-white/10">
					{profileItems.map((item) => (
						<ProfileListRow key={item.label} label={item.label} value={item.value} />
					))}
				</ul>

				<div className="mt-6 border-t border-white/10 pt-5">
					<button
						type="button"
						onClick={openDeleteModal}
						className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15"
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
