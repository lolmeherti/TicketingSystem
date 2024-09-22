"use client";

import React from "react";
import { User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Task {
    title: string;
    priority: "high" | "med" | "low";
    assignee: {
        name: string;
    };
}

interface TaskCardProps {
    task: Task;
}

const priorityColors: { [key in Task["priority"]]: string } = {
    high: "bg-red-500",
    med: "bg-yellow-500",
    low: "bg-green-500",
};

function getInitials(name: string) {
    const names = name.split(' ');
    return names.map(n => n.charAt(0).toUpperCase()).join('');
}

export function TaskCard({ task }: TaskCardProps) {
    return (
        <Card className="mb-4 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-50 to-white border border-gray-200">
            <CardHeader className="p-4">
                <div className="flex justify-between items-center">
                    <div
                        className={`w-3 h-3 rounded-full ${priorityColors[task.priority]} ring-2 ring-offset-2 ring-opacity-50 ${
                            task.priority === 'high' ? 'ring-red-200' :
                                task.priority === 'med' ? 'ring-yellow-200' : 'ring-green-200'
                        }`}
                    />
                    <span className="text-xs font-medium text-gray-500 uppercase">{task.priority} Priority</span>
                </div>
                <CardTitle className="text-lg font-semibold mt-3 text-gray-800">
                    {task.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-gray-600">
                        <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{task.assignee.name}</span>
                    </div>
                    <Avatar className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 text-stone-800 font-bold">
                        <AvatarFallback>{getInitials(task.assignee.name)}</AvatarFallback>
                    </Avatar>
                </div>
            </CardContent>
        </Card>
    );
}