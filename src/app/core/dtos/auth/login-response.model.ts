export interface LoginResponseDTO {
    accessToken: string;
    /** Token de sesión de larga vida (24h) que vive en user_session; se usa para refrescar el access token. */
    sessionToken?: string;
    expiresAt?: string;
    expiresIn?: number;
    user?: {
        userId: number;
        fullName: string;
        email: string;
    };
    allowedFeatures?: string[];
}

export interface RefreshResponseDTO {
    accessToken: string;
    allowedFeatures?: string[];
}