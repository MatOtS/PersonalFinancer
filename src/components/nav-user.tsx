"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { CaretUpDownIcon, SparkleIcon, UserIcon, BellIcon, CreditCardIcon, GearIcon, LifebuoyIcon, SignOutIcon } from "@phosphor-icons/react";

type UserType = {
	name: string;
	email: string;
	avatar: string;
};

const user: UserType = {
	name: "Shaban Haider",
	email: "shaban@efferd.com",
	avatar: "https://github.com/shabanhr.png",
};

export function NavUser() {
	const { isMobile } = useSidebar();

	return (
		<SidebarMenu className="border-t p-2">
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger render={<SidebarMenuButton className="text-muted-foreground" />}><Avatar className="size-5">
                    								<AvatarImage alt={user.name} src={user.avatar} />
                    								<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    							</Avatar><span className="font-medium text-sm">
                    								{user.name.split(" ")[0]}
                    							</span><CaretUpDownIcon className="ml-auto size-3!" /></DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="min-w-48"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<SparkleIcon
								/>
								Upgrade to Pro
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<UserIcon
								/>
								Profile
							</DropdownMenuItem>
							<DropdownMenuItem>
								<BellIcon
								/>
								Notifications
							</DropdownMenuItem>
							<DropdownMenuItem>
								<CreditCardIcon
								/>
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem>
								<GearIcon
								/>
								Settings
							</DropdownMenuItem>
							<DropdownMenuItem>
								<LifebuoyIcon
								/>
								Help Center
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive">
							<SignOutIcon
							/>
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
