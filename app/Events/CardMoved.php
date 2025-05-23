<?php

namespace App\Events;

use App\Models\Post;
use App\Utils\PostFormatterUtil;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class CardMoved implements ShouldBroadcastNow
{
    use SerializesModels;

    public int $postId;
    public int $boardId;
    public string $title;
    public ?string $deadline;
    public int $pinned;
    public string $priority;
    public int $assigneeId;
    public string $assigneeName;
    public string $desc;
    public bool $isDeleted;

    public function __construct(Post $post, public string $newColumnId)
    {
        $this->postId       = $post->id;
        $this->boardId      = $post->fid_board;
        $this->title        = $post->title;
        $this->desc         = $post->desc;
        $this->deadline     = $post->deadline;
        $this->pinned       = $post->pinned ?? 0;
        $this->priority     = $post->priority;
        $this->assigneeId   = $post->assignee_id;
        $this->assigneeName = $post->assignee->name ?? 'Unassigned';
        $this->isDeleted    = !$post->exists;
    }

    public function broadcastOn(): Channel
    {
        return new Channel("board.{$this->boardId}");
    }

    public function broadcastAs(): string
    {
        return 'CardMoved';
    }

    public function broadcastWith(): array
    {
        return [
            'post_id'        => $this->postId,
            'new_column_id'  => $this->newColumnId,
            'title'          => $this->title,
            'desc'           => $this->desc,
            'deadline'       => $this->deadline,
            'pinned'         => $this->pinned,
            'priority'       => $this->priority,
            'assignee_id'    => $this->assigneeId,
            'assignee_name'  => $this->assigneeName,
            'is_deleted'     => $this->isDeleted,
            'deadline_color' => PostFormatterUtil::getDeadlineColor($this->deadline),
        ];
    }
}
