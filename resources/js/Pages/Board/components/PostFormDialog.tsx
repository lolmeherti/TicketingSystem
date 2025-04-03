"use client"

import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useForm, useWatch } from "react-hook-form"
import { Inertia } from "@inertiajs/inertia"
import { Button } from "@/components/ui/button"
import { ExpandableTipTapTextArea } from "./ExpandableTipTapTextArea"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Trash2Icon, EyeIcon, EditIcon, Maximize2Icon, Minimize2Icon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import CommentSection from "@/Pages/Board/components/CommentSection"
import DeleteConfirmationDialog from "@/Pages/Board/components/DeleteConfirmation"
import ActivityHistory from "@/Pages/Board/components/ActivityHistory"
import LinkedIssuesSection from "@/Pages/Board/components/LinkedIssues"

const Portal = ({ children }: { children: React.ReactNode }) => {
    return createPortal(children, document.body)
}

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    desc: z.string().min(1, "Description is required"),
    priority: z.string().min(1, "Priority is required"),
    column: z.string().min(1, "Column is required"),
    assignee_id: z.string().min(1, "Assignee is required"),
    deadline: z.date().nullable(),
    fid_board: z.string().min(1, "Board is required"),
})

type FormData = z.infer<typeof formSchema>

interface Board {
    id: string
    title: string
    columns: string[]
}

interface Assignee {
    id: string
    name: string
}

interface Task {
    id: string
    title: string
    desc: string
    priority: string
    column: string
    assignee_id: string
    deadline: string | null
    fid_board: string
    post_author: string
    comments?: Comment[]
}

interface PostFormDialogProps {
    priorities: string[]
    boards: Board[]
    assignees: Assignee[]
    task?: Task
    onClose?: () => void
    authUserId: string
}

interface Comment {
    id: string
    content: string
    author: string
    createdAt: string
}

export function PostFormDialog({
                                   boards = [],
                                   assignees = [],
                                   priorities = [],
                                   task,
                                   onClose,
                                   authUserId,
                               }: PostFormDialogProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(!!task)

    const [boardSelectOpen, setBoardSelectOpen] = useState(false)
    const [columnSelectOpen, setColumnSelectOpen] = useState(false)
    const [prioritySelectOpen, setPrioritySelectOpen] = useState(false)
    const [assigneeSelectOpen, setAssigneeSelectOpen] = useState(false)
    const [deadlinePopoverOpen, setDeadlinePopoverOpen] = useState(false)

    const [availableColumns, setAvailableColumns] = useState<string[]>([])
    const [isPreview, setIsPreview] = useState(!!task)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isOptimizing, setIsOptimizing] = useState(false)

    const { toast } = useToast()

    const [originalDescription, setOriginalDescription] = useState("")

    const defaultValues = task
        ? {
            title: task.title || "",
            desc: task.desc || "",
            priority: task.priority || "",
            column: task.column || "",
            assignee_id: task.assignee_id?.toString() || "",
            deadline: task.deadline ? new Date(task.deadline) : null,
            fid_board: task.fid_board?.toString() || "",
            post_author: task.post_author?.toString() || "",
        }
        : {
            title: "",
            desc: "",
            priority: "",
            column: "",
            assignee_id: "",
            deadline: null,
            fid_board: "",
            post_author: "",
        }

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues,
    })

    const commentSchema = z.object({
        content: z.string().min(3, "Comment is required and must be longer than 3 characters."),
    })
    const commentForm = useForm({
        resolver: zodResolver(commentSchema),
        defaultValues: {
            content: "",
        },
    })

    const selectedBoardId = useWatch({
        control: form.control,
        name: "fid_board",
    }).toString()

    useEffect(() => {
        if (!selectedBoardId) {
            setAvailableColumns([])
            form.setValue("column", "")
            return
        }

        const selectedBoard = boards.find((board) => board.id.toString() === selectedBoardId)

        if (selectedBoard && selectedBoard.columns && selectedBoard.columns.length > 0) {
            setAvailableColumns(selectedBoard.columns)
            if (!selectedBoard.columns.includes(form.getValues("column"))) {
                form.setValue("column", "")
            }
        } else {
            setAvailableColumns([])
            form.setValue("column", "")
        }
    }, [selectedBoardId, boards])

    function onSubmit(values: FormData) {
        const formattedValues = { ...values }

        if (formattedValues.deadline) {
            const date = new Date(formattedValues.deadline)
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
            formattedValues.deadline = formattedDate
        }

        if (task) {
            Inertia.put(`/posts/${task.id}`, formattedValues, {
                onSuccess: () => {
                    setTimeout(() => {
                        form.reset()
                    }, 100)

                    setIsDialogOpen(false)
                    onClose && onClose()
                },
                onError: (errors) => {
                    console.error(errors)
                },
            })
        } else {
            Inertia.post("/posts", formattedValues, {
                onSuccess: () => {
                    setTimeout(() => {
                        form.reset()
                    }, 100)

                    setIsDialogOpen(false)
                },
                onError: (errors) => {
                    console.error(errors)
                },
            })
        }
    }

    const handleDialogClose = () => {
        setShowDeleteConfirmation(false)
    }

    function onDelete() {
        setShowDeleteConfirmation(true)
    }

    const toggleExpansion = () => {
        setIsExpanded(!isExpanded)
    }

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            document.querySelectorAll('[data-state="open"]').forEach((el) => {
                ;(el as HTMLElement).blur()
            })
            setTimeout(() => {
                setIsDialogOpen(false)
                if (onClose) onClose()
            }, 50)
        } else {
            setIsDialogOpen(true)
        }
    }

    return (
        <>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                {!task && (
                    <DialogTrigger asChild>
                        <Button variant="outline" className="bg-white text-zinc-900 hover:bg-zinc-100">
                            Create New Post
                        </Button>
                    </DialogTrigger>
                )}
                {isDialogOpen && (
                    <DialogContent
                        className={`bg-zinc-800 text-white border border-zinc-700 transition-all duration-300 ${
                            isExpanded ? "sm:max-w-[90vw] w-[90vw] h-[98vh]" : "sm:max-w-[1000px]"
                        }`}
                    >
                        <DialogHeader>
                            <div className="flex items-center">
                                <DialogTitle className="text-white text-2xl flex items-center">
                                    {task ? "Edit Post" : "Create New Post"}
                                </DialogTitle>
                                {task && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onDelete}
                                        className="ml-2 text-red-400 hover:text-red-300 hover:bg-red-100/10 p-1"
                                    >
                                        <Trash2Icon className="h-5 w-5" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleExpansion}
                                    className="ml-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-100/10 p-1"
                                >
                                    {isExpanded ? <Minimize2Icon className="h-5 w-5" /> : <Maximize2Icon className="h-5 w-5" />}
                                </Button>
                            </div>
                        </DialogHeader>

                        <div
                            className={`overflow-y-auto pr-4 ${isExpanded ? "h-[calc(98vh-180px)]" : "max-h-[calc(100vh-240px)]"}`}
                        >
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                    <div className="grid grid-cols-[2fr_1fr] gap-6">
                                        <div className="space-y-8">
                                            <FormField
                                                control={form.control}
                                                name="title"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-white">Title</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter title"
                                                                {...field}
                                                                className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="desc"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <FormLabel className="text-white">Description</FormLabel>
                                                            <div className="flex items-center gap-2">
                                                                {task && (
                                                                    <>
                                                                        <Button
                                                                            disabled={isOptimizing}
                                                                            onClick={async (e) => {
                                                                                e.preventDefault()
                                                                                e.stopPropagation()

                                                                                if (isOptimizing) return
                                                                                setIsOptimizing(true)

                                                                                try {
                                                                                    const { data } = await axios.post("/premium/description/optimise", {
                                                                                        post_id: task.id,
                                                                                    })

                                                                                    if (data?.description) {
                                                                                        // Save the original description only on success
                                                                                        const currentDesc = form.getValues("desc")
                                                                                        setOriginalDescription(currentDesc)
                                                                                        form.setValue("desc", data.description)

                                                                                        toast({
                                                                                            title: "Description optimized",
                                                                                            description: "Updated description has been set, but not saved yet.",
                                                                                        })
                                                                                    } else {
                                                                                        toast({
                                                                                            title: "No description returned",
                                                                                            description: "The optimization service did not return any content.",
                                                                                        })
                                                                                    }
                                                                                } catch (err) {
                                                                                    toast({
                                                                                        title: "Failed to optimize",
                                                                                        description: "Something went wrong during the optimization.",
                                                                                        variant: "destructive",
                                                                                    })
                                                                                    console.error(err)
                                                                                } finally {
                                                                                    setIsOptimizing(false)
                                                                                }
                                                                            }}
                                                                            className="bg-zinc-800/90 backdrop-blur-sm hover:bg-zinc-700/90 text-white rounded-md px-2.5 py-0.5 text-xs flex items-center gap-1 border border-zinc-700/50"
                                                                            title="Optimize Description"
                                                                        >
                                                                            {isOptimizing ? (
                                                                                <>
                                                                                    <svg
                                                                                        className="animate-spin h-3.5 w-3.5 text-purple-400"
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        fill="none"
                                                                                        viewBox="0 0 24 24"
                                                                                    >
                                                                                        <circle
                                                                                            className="opacity-25"
                                                                                            cx="12"
                                                                                            cy="12"
                                                                                            r="10"
                                                                                            stroke="currentColor"
                                                                                            strokeWidth="4"
                                                                                        ></circle>
                                                                                        <path
                                                                                            className="opacity-75"
                                                                                            fill="currentColor"
                                                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                                        ></path>
                                                                                    </svg>
                                                                                    <span>Optimizing...</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <svg
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        width="14"
                                                                                        height="14"
                                                                                        viewBox="0 0 24 24"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        strokeWidth="2"
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        className="text-purple-400"
                                                                                    >
                                                                                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                                                                        <path d="M5 3v4" />
                                                                                        <path d="M3 5h4" />
                                                                                        <path d="M19 17v4" />
                                                                                        <path d="M17 19h4" />
                                                                                    </svg>
                                                                                    <span>Optimize</span>
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                        {originalDescription && (
                                                                            <Button
                                                                                onClick={(e) => {
                                                                                    e.preventDefault()
                                                                                    e.stopPropagation()
                                                                                    form.setValue("desc", originalDescription)
                                                                                    setOriginalDescription("") // Clear undo state so the button hides
                                                                                    toast({
                                                                                        title: "Description restored",
                                                                                        description: "Original description has been restored.",
                                                                                    })
                                                                                }}
                                                                                className="bg-zinc-800/90 backdrop-blur-sm hover:bg-zinc-700/90 text-white rounded-md px-2.5 py-0.5 text-xs flex items-center gap-1 border border-zinc-700/50"
                                                                                title="Undo Optimization"
                                                                            >
                                                                                <svg
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    width="14"
                                                                                    height="14"
                                                                                    viewBox="0 0 24 24"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    strokeWidth="2"
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    className="text-amber-400"
                                                                                >
                                                                                    <path d="M3 7v6h6" />
                                                                                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                                                                                </svg>
                                                                                <span>Undo</span>
                                                                            </Button>
                                                                        )}

                                                                        <Button
                                                                            onClick={(e) => {
                                                                                e.preventDefault()
                                                                                e.stopPropagation()
                                                                                Inertia.post("/premium/generate/pr", { post_id: task.id })
                                                                            }}
                                                                            className="bg-zinc-800/90 backdrop-blur-sm hover:bg-zinc-700/90 text-white rounded-md px-2.5 py-0.5 text-xs flex items-center gap-1 border border-zinc-700/50"
                                                                            title="Generate PR"
                                                                        >
                                                                            <svg
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                width="14"
                                                                                height="14"
                                                                                viewBox="0 0 24 24"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                strokeWidth="2"
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                className="text-teal-400"
                                                                            >
                                                                                <circle cx="18" cy="18" r="3" />
                                                                                <circle cx="6" cy="6" r="3" />
                                                                                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                                                                                <path d="M6 9v12" />
                                                                            </svg>
                                                                            <span>Generate PR</span>
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                <Button
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        setIsPreview(!isPreview)
                                                                    }}
                                                                    className="bg-zinc-800/90 backdrop-blur-sm hover:bg-zinc-700/90 text-white rounded-md px-2.5 py-0.5 text-xs flex items-center gap-1 border border-zinc-700/50"
                                                                    title={isPreview ? "Edit" : "Preview"}
                                                                >
                                                                    {isPreview ? (
                                                                        <EditIcon className="h-3.5 w-3.5 text-amber-400" />
                                                                    ) : (
                                                                        <EyeIcon className="h-3.5 w-3.5 text-amber-400" />
                                                                    )}
                                                                    <span>{isPreview ? "Edit" : "Preview"}</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <FormControl>
                                                            <ExpandableTipTapTextArea
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                className="bg-zinc-700 text-white border border-zinc-600 rounded-md focus-within:border-white focus-within:ring-1 focus-within:ring-white"
                                                                isPreview={isPreview}
                                                                assignees={assignees}
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="fid_board"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-white">Board</FormLabel>
                                                        <Select
                                                            open={boardSelectOpen}
                                                            onOpenChange={setBoardSelectOpen}
                                                            onValueChange={(value) => {
                                                                field.onChange(value)
                                                                setBoardSelectOpen(false)
                                                            }}
                                                            value={field.value || ""}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white">
                                                                    <SelectValue placeholder="Select board" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                                {boards.map((board) => (
                                                                    <SelectItem key={board.id} value={board.id.toString()} className="hover:bg-zinc-600">
                                                                        {board.title}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="column"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-white">Column</FormLabel>
                                                        <Select
                                                            open={columnSelectOpen}
                                                            onOpenChange={setColumnSelectOpen}
                                                            onValueChange={(value) => {
                                                                field.onChange(value)
                                                                setColumnSelectOpen(false)
                                                            }}
                                                            value={field.value || ""}
                                                            disabled={!availableColumns.length}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white">
                                                                    <SelectValue
                                                                        placeholder={availableColumns.length ? "Select column" : "Select a board first"}
                                                                    />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                                {availableColumns.map((col, idx) => (
                                                                    <SelectItem key={idx} value={col} className="hover:bg-zinc-600">
                                                                        {col}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="priority"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-white">Priority</FormLabel>
                                                        <Select
                                                            open={prioritySelectOpen}
                                                            onOpenChange={setPrioritySelectOpen}
                                                            onValueChange={(value) => {
                                                                field.onChange(value)
                                                                setPrioritySelectOpen(false)
                                                            }}
                                                            value={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white">
                                                                    <SelectValue placeholder="Select priority" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                                {priorities.map((priority) => (
                                                                    <SelectItem key={priority} value={priority} className="hover:bg-zinc-600">
                                                                        {priority}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                            {task && (
                                                <FormItem>
                                                    <FormLabel className="text-white">Author</FormLabel>
                                                    <div className="flex items-center gap-2 p-2 bg-zinc-700 rounded-md border border-zinc-600">
                                                        <div className="flex flex-col">
                              <span className="text-sm font-medium text-white">
                                {assignees.find((a) => a.id.toString() === form.getValues("post_author"))?.name ||
                                    form.getValues("post_author")}
                              </span>
                                                        </div>
                                                    </div>
                                                </FormItem>
                                            )}
                                            <FormField
                                                control={form.control}
                                                name="assignee_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-white">Assignee</FormLabel>
                                                        <Select
                                                            open={assigneeSelectOpen}
                                                            onOpenChange={setAssigneeSelectOpen}
                                                            onValueChange={(value) => {
                                                                field.onChange(value)
                                                                setAssigneeSelectOpen(false)
                                                            }}
                                                            value={field.value || ""}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white">
                                                                    <SelectValue placeholder="Select assignee" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                                {assignees.map((assignee) => (
                                                                    <SelectItem
                                                                        key={assignee.id}
                                                                        value={assignee.id.toString()}
                                                                        className="hover:bg-zinc-600"
                                                                    >
                                                                        {assignee.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="deadline"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col mt-2">
                                                        <FormLabel className="text-white">Deadline</FormLabel>
                                                        <Popover open={deadlinePopoverOpen} onOpenChange={setDeadlinePopoverOpen}>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "w-full pl-3 text-left font-normal bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white",
                                                                            !field.value && "text-muted-foreground",
                                                                        )}
                                                                    >
                                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <Portal>
                                                                <PopoverContent
                                                                    side="bottom"
                                                                    align="start"
                                                                    sideOffset={4}
                                                                    className="z-[9999] w-auto p-0 bg-zinc-700 pointer-events-auto"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div onClick={(e) => e.stopPropagation()}>
                                                                        <Calendar
                                                                            mode="single"
                                                                            selected={field.value}
                                                                            onSelect={(val) => {
                                                                                field.onChange(val)
                                                                                setDeadlinePopoverOpen(false)
                                                                            }}
                                                                            disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                                                                            initialFocus
                                                                            className="bg-zinc-700 text-white"
                                                                        />
                                                                    </div>
                                                                </PopoverContent>
                                                            </Portal>
                                                        </Popover>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </form>
                            </Form>
                            {task && task.comments && (
                                <CommentSection taskId={task.id} currentUserId={authUserId} assignees={assignees} />
                            )}
                            {task && <ActivityHistory postId={task.id} />}
                            {task && <LinkedIssuesSection taskId={task.id} currentUserId={authUserId} />}
                        </div>
                        <div className="mt-6">
                            <Button
                                type="submit"
                                onClick={form.handleSubmit(onSubmit)}
                                className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
                            >
                                {task ? "Update" : "Submit"}
                            </Button>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
            {showDeleteConfirmation && (
                <DeleteConfirmationDialog id={task?.id ?? ""} type="Post" isOpen={true} onClose={handleDialogClose} />
            )}
        </>
    )
}

export default React.memo(PostFormDialog)

