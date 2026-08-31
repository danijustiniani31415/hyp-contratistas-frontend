import { ConstructionLogbookControlGetDTO } from "../../dtos/constructionLogbookControl/constructionLogbookControlGet.model";
import { SafeResourceUrl } from "@angular/platform-browser";
import { ConstructionLogbookControlFiltersDTO } from "../../dtos/constructionLogbookControl/constructionLogbookControlFilters.model";
import { SelectedFilters } from "../../dtos/constructionLogbookControl/constructionLogbookSelectedFilters";

export interface TableComponentData {
    tableData: ConstructionLogbookControlGetDTO[];
    iframeUrl: SafeResourceUrl | null;
    filters: ConstructionLogbookControlFiltersDTO;
    selectedFilters: SelectedFilters
}