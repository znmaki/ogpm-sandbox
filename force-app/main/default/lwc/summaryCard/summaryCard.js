import { LightningElement, api, track } from 'lwc';

export default class SummaryCard extends LightningElement {
    @api title;
    @track value;

    @api
    handleValueChange(value){
        this.value = value;
    }
}