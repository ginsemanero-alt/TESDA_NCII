<?php

namespace App\Http\Requests\Auth;

use App\Models\Section;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:120'],
            'lrn' => ['required', 'digits:12'],
            'section' => ['required', 'string', Rule::exists(Section::class, 'name')],
            'password' => ['required', Password::min(8)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'full_name.required' => 'Enter your full name, surname first.',
            'lrn.required' => 'Enter your 12-digit LRN.',
            'lrn.digits' => 'The LRN is exactly 12 digits.',
            'section.required' => 'Choose your section.',
            'section.exists' => 'That section is not set up yet. Ask your instructor.',
            'password.min' => 'Use at least 8 characters.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('lrn')) {
            $this->merge([
                'lrn' => preg_replace('/\D/', '', (string) $this->input('lrn')),
            ]);
        }
    }
}
