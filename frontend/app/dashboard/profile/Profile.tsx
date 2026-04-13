'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../DashboardContext';

function ProfileListRow({ label, value }: { label: string; value: string }) {
	return (
		<li className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
			<span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</span>
			<span className="text-sm font-semibold text-zinc-100 sm:text-base">{value}</span>
		</li>
	);
}

export default function Profile() {
	const { user } = useDashboard();

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

	return (
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
		</motion.section>
	);
}
