<?php

namespace App\Http\Controllers;

use App\Enums\LinkTypeEnums;
use App\Http\Requests\LinkedIssueRequest;
use App\Http\Requests\UpdateLinkedIssueRequest;
use App\Models\LinkedIssues;
use App\Services\LinkedIssuesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LinkedIssuesController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $postId       = $request->input('fid_origin_post');
        $linkedIssues = LinkedIssues::where('fid_origin_post', $postId)
            ->with('creator', 'relatedPost')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'issues'     => $linkedIssues,
            'link_types' => LinkTypeEnums::asSelectArray(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(LinkedIssueRequest $request, LinkedIssuesService $linkedIssuesService): JsonResponse
    {
        $validatedData             = $request->validated();
        $validatedData['fid_user'] = Auth::id();

        return DB::transaction(function () use ($validatedData, $linkedIssuesService) {
            $linkedIssue = LinkedIssues::firstOrCreate([
                'fid_origin_post'  => $validatedData['fid_origin_post'],
                'fid_related_post' => $validatedData['fid_related_post'],
                'link_type'        => $validatedData['link_type'],
            ], $validatedData);

            if (!$linkedIssue->wasRecentlyCreated) {
                return response()->json(['message' => 'This link already exists'], 422);
            }

            $reverseLinkType = $linkedIssuesService->getReverseStatus($validatedData['link_type']);

            LinkedIssues::updateOrCreate([
                'fid_origin_post'  => $validatedData['fid_related_post'],
                'fid_related_post' => $validatedData['fid_origin_post'],
            ], [
                'link_type' => $reverseLinkType,
                'fid_user'  => Auth::id(),
            ]);

            $linkedIssue->load(['creator', 'relatedPost']);
            $linkedIssue->notify();

            return response()->json($linkedIssue);
        });
    }

    /**
     * Display the specified resource.
     */
    public function show(LinkedIssues $linkedIssues)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(LinkedIssues $linkedIssues)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateLinkedIssueRequest $request, LinkedIssues $linkedIssue, LinkedIssuesService $linkedIssuesService): JsonResponse
    {
        $validatedData = $request->validated();

        return DB::transaction(function () use ($validatedData, $linkedIssue, $linkedIssuesService) {
            $linkedIssue->update(['link_type' => $validatedData['link_type']]);

            $reverseLinkType = $linkedIssuesService->getReverseStatus($validatedData['link_type']);

            LinkedIssues::updateOrCreate([
                'fid_origin_post'  => $linkedIssue->fid_related_post,
                'fid_related_post' => $linkedIssue->fid_origin_post,
            ], [
                'link_type' => $reverseLinkType,
                'fid_user'  => Auth::id(),
            ]);

            $linkedIssue->load(['creator', 'relatedPost']);
            $linkedIssue->notify();

            return response()->json($linkedIssue);
        });
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(LinkedIssues $linkedIssue, LinkedIssuesService $linkedIssuesService): JsonResponse
    {
        return DB::transaction(function () use ($linkedIssue, $linkedIssuesService) {
            $notificationData = clone $linkedIssue;

            $reverseLinkType = $linkedIssuesService->getReverseStatus($linkedIssue->link_type);

            $reverseLink = LinkedIssues::where('fid_origin_post', $linkedIssue->fid_related_post)
                ->where('fid_related_post', $linkedIssue->fid_origin_post)
                ->where('link_type', $reverseLinkType)
                ->first();

            if ($reverseLink) {
                $reverseLink->delete();
            }

            $linkedIssue->delete();

            $notificationData->notify();

            return response()->json(['message' => 'Linked issue deleted successfully']);
        });
    }
}
