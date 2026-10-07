<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('quiz_scores', function (Blueprint $table) {
            $table->foreignId('quiz_id')->nullable()->after('competency_id')->constrained()->nullOnDelete();
            $table->json('answers')->nullable()->after('total');
            $table->unsignedTinyInteger('attempt_number')->default(1)->after('answers');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quiz_scores', function (Blueprint $table) {
            $table->dropConstrainedForeignId('quiz_id');
            $table->dropColumn(['answers', 'attempt_number']);
        });
    }
};
