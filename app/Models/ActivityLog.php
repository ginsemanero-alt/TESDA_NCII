<?php

namespace App\Models;

use Database\Factories\ActivityLogFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    /** @use HasFactory<ActivityLogFactory> */
    use HasFactory;

    public const CATEGORY_SIGN_IN = 'sign_in';

    public const CATEGORY_CONTENT = 'content';

    public const CATEGORY_ACCOUNT = 'account';

    public const CATEGORY_SYSTEM = 'system';

    protected $fillable = [
        'category',
        'description',
        'actor',
        'device',
        'occurred_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
        ];
    }
}
