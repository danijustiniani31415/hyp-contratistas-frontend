import { IvtControlGetDTO } from "../../dtos/ivtControl/ivtControlGet.model";
import { SafeResourceUrl } from "@angular/platform-browser";
import { IvtControlFiltersDTO } from "../../dtos/ivtControl/ivtControlFilters.model";
import { SelectedFilters } from "../../dtos/ivtControl/ivtControlSelectedFilters";

export interface TableComponentData {
    tableData: IvtControlGetDTO[];
    iframeUrl: SafeResourceUrl | null;
    filters: IvtControlFiltersDTO;
    selectedFilters: SelectedFilters
}