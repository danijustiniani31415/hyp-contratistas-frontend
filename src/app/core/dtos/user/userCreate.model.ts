export interface UserCreateDTO {
    documentIdentityCode: string;
    firstNames: string;
    firstLastName: string;
    secondLastName: string;
    email: string;
    phoneNumber: number;
    createdUserId: number;
    active: boolean;
    roleId: number;
}