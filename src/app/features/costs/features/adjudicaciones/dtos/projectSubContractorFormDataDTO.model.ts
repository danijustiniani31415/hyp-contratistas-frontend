import { ProjectSimpleDTO } from "../../../../../core/dtos/project/projectSimple.model";
import { ContributorFactoryDTO } from "./companyFactoryDTO.model";
import { ContractTypeSimpleDTO } from "./contractTypeSimple.model";
import { ContractModalitySimpleDTO } from "./contractModalitySimple.model";
import { CurrencySimpleDTO } from "./currencySimple.model";
import { PaymentMethodSimpleDTO } from "./paymentMethodSimple.model";
import { PaymentFormSimpleDTO } from "./paymentFormSimple.model";
import { WorkItemSimpleDTO } from "./workItemSimple.model";
import { WorkItemCategorySimpleDTO } from "./workItemCategorySimple.model";
import { WorkSpecialtySimpleDTO } from "./workSpecialtySimple.model";
import { ProjectSubContractorStatusSimpleDTO } from "./projectSubContractorStatusSimple.model";

export interface ProjectSubContractorFormDataDTO {
    projects: ProjectSimpleDTO[];
    contractTypes: ContractTypeSimpleDTO[];
    contractModalities: ContractModalitySimpleDTO[];
    paymentMethods: PaymentMethodSimpleDTO[];
    paymentForms: PaymentFormSimpleDTO[];
    currencies: CurrencySimpleDTO[];
    workItems: WorkItemSimpleDTO[];
    contributors: ContributorFactoryDTO[];
    workItemCategories: WorkItemCategorySimpleDTO[];
    workSpecialties: WorkSpecialtySimpleDTO[];
    projectSubContractorStatuses: ProjectSubContractorStatusSimpleDTO[];
}