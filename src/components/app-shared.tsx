import { SquaresFourIcon, ChartBarIcon, BriefcaseIcon, UsersIcon, PlugIcon, KeyIcon, GearIcon, PaperPlaneTiltIcon, QuestionIcon, BookOpenIcon } from "@phosphor-icons/react";

export type SidebarNavItem = {
	title: string;
	url: string;
	icon: React.ReactNode;
	isActive?: boolean;
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Product",
		items: [
			{
				title: "Dashboard",
				url: "#/overview",
				icon: (
					<SquaresFourIcon
					/>
				),
				isActive: true,
			},
			{
				title: "Analytics",
				url: "#/analytics",
				icon: (
					<ChartBarIcon
					/>
				),
			},
			{
				title: "Projects",
				url: "#/projects",
				icon: (
					<BriefcaseIcon
					/>
				),
			},
			{
				title: "Team",
				url: "#/team",
				icon: (
					<UsersIcon
					/>
				),
			},
			{
				title: "Integrations",
				url: "#/integrations",
				icon: (
					<PlugIcon
					/>
				),
			},
			{
				title: "API Keys",
				url: "#/api-keys",
				icon: (
					<KeyIcon
					/>
				),
			},
		],
	},
	{
		label: "Administration",
		items: [
			{
				title: "Settings",
				url: "#/settings",
				icon: (
					<GearIcon
					/>
				),
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Feedback",
		url: "#/feedback",
		icon: (
			<PaperPlaneTiltIcon data-icon="inline-start" />
		),
	},
	{
		title: "Help Center",
		url: "#/help",
		icon: (
			<QuestionIcon
			/>
		),
	},

	{
		title: "Documentation",
		url: "#/documentation",
		icon: (
			<BookOpenIcon
			/>
		),
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) => group.items),
	...footerNavLinks,
];
