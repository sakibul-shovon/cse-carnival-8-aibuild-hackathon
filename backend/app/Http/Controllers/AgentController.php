<?php

namespace App\Http\Controllers;

use App\Services\AgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentController extends Controller
{
    protected AgentService $agentService;

    public function __construct(AgentService $agentService)
    {
        $this->agentService = $agentService;
    }

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string',
            'history' => 'nullable|array',
        ]);

        $message = $validated['message'];
        $history = $validated['history'] ?? [];
        $role = $request->user()?->role ?? 'student';

        $result = $this->agentService->processQuery($message, $history, $role);

        return response()->json($result);
    }
}
