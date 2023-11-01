import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getInvestmentsSummatory from "@salesforce/apex/DatawarehouseService.getInvestmentsSummatory"
import getAverageFromQR4 from "@salesforce/apex/DatawarehouseService.getAverageFromQR4Reports"
import getQR4DivindendsSummatory from "@salesforce/apex/DatawarehouseService.getQR4DividendsSummatory"
import getActivePoolDealDividendsByQuarterYear from "@salesforce/apex/DatawarehouseService.getActivePoolDealDividendsByQuarterYear"
import getInvestmentAmountByDealAndCloseDate from "@salesforce/apex/DatawarehouseService.getInvestmentAmountByDealAndCloseDate"
import getInvestmentAmountByPropertyType from "@salesforce/apex/DatawarehouseService.getInvestmentAmountByPropertyType"
import getInvestmentAmountByPropertyZone from "@salesforce/apex/DatawarehouseService.getInvestmentAmountByPropertyZone"
import getAverageCashOnCashByQR4Year from "@salesforce/apex/DatawarehouseService.getAverageCashOnCashByQR4Year"

export default class GraphicSummary extends LightningElement {
    @wire(CurrentPageReference)
    currentPageReference;

    @track investmentsSummatory = null;
    @track averageFromQR4 = null;
    @track qr4DivindendsSummatory = null;

    userId = null;
    groupName = null;

    dividendsByQuarterYearChart = null;

    initializeParams(){
        const { inv, grp } = this.currentPageReference.state;

        if(!inv) return;

        const base64Id = inv.substring(0,12) + inv.substring(18);
        this.userId = atob(base64Id);

        if(grp) {
            this.groupName = atob(grp);
        }
    }

    areParamsInitialized(){
        return Boolean(this.userId);
    }

    formatPercent(number){
        return number.toFixed(2) + '%';
    }

    formatMoney(number){
        let result = '';
        if (number >= 1e12) {
            result = (number / 1e12).toFixed(1) + 'T';
        } else if (number >= 1e9) {
            result = (number / 1e9).toFixed(1) + 'B';
        } else if (number >= 1e6) {
            result = (number / 1e6).toFixed(1) + 'M';
        } else if (number >= 1e3) {
            result =(number / 1e3).toFixed(1) + 'K';
        }
        return '$' + result 
    }

    connectedCallback(){
        this.initializeParams();

        if(this.areParamsInitialized()){
            const params = { investorId: this.userId, groupName: this.groupName };

            Promise.all([
                getInvestmentsSummatory(params),
                getAverageFromQR4(params),
                getQR4DivindendsSummatory(params),
                getActivePoolDealDividendsByQuarterYear(params),
                getInvestmentAmountByDealAndCloseDate(params),
                getInvestmentAmountByPropertyType(params),
                getInvestmentAmountByPropertyZone(params),
                getAverageCashOnCashByQR4Year(params)
            ]).then(results => {
                this.handleSummaryCards(results.slice(0,3));
                this.handleDividendsByQuarterYear(results[3]);
                this.handleInvestmentAmountByDealAndCloseDate(results[4]);
                this.handleInvestmentByPropertyType(results[5]);
                this.handleInvestmentByPropertyZone(results[6]);
                this.handleAverageCashOnCashByQR4Year(results[7]);
            }).catch(error => {
                console.log('error', error);
            })
        }
    }

    handleAverageCashOnCashByQR4Year(results){
        const dataset = results.map(result => ({ date: result.QuarterYear, value: result.CashOnCash}));
        const average = dataset.reduce((acc, cur) => acc + cur.value, 0) / dataset.length;

        const graph = this.template.querySelector('c-linear-chart');

        graph.setDataset(dataset);
        graph.setHeight(300);
        graph.setWidth(500);
        graph.setLimit(average);

        setTimeout(() => {
            graph.renderChart();
        }
        , 1000);
    }

    handleInvestmentByPropertyZone(results){
        const graph = this.template.querySelector('c-piechart[data-id="investment-by-property-zone"]');
        const dataset = this.tranformForPieDataset(results, 'PropertyZone', 'TotalAmount');

        graph.setHeight(200)
        graph.setWidth(200);
        graph.setDataset(dataset);

        setTimeout(() => {
            graph.renderChart();
        }
        , 1000);
    }

    handleInvestmentByPropertyType(results){
        const graph = this.template.querySelector('c-piechart[data-id="investment-by-property-type"]');
        const dataset = this.tranformForPieDataset(results, 'PropertyType', 'TotalAmount');

        graph.setHeight(200)
        graph.setWidth(200);
        graph.setDataset(dataset);

        setTimeout(() => {
            graph.renderChart();
        }
        , 1000);
    }

    

    tranformForPieDataset(results, labelField, valueField){
        const dataset = [];

        results.forEach(result => {
            const { [labelField]: label, [valueField]: value } = result;
            dataset.push({ label, value });
        })

        return dataset;
    }

    handleInvestmentAmountByDealAndCloseDate(results){
        const datasets = this.transformInvestmentsToDataset(results)
        
        const subgroups = this.getGroupsFromDataset(datasets, 'date');
        const groups = datasets.map(element => element.date);

        const graph = this.template.querySelector('c-stacked-barchart[data-id="investment-amount-by-deal-and-close-date"]');

        graph.setGroups(groups);
        graph.setSubgroups(subgroups);
        graph.setDataset(datasets);
        graph.setWidth(300);
        graph.setHeight(300);

        setTimeout(() => {
            graph.renderChart();
        }
        , 1000);

    }

    handleDividendsByQuarterYearResize(){
        const container = this.template.querySelector('div[data-id="dividends-by-quarter-year-container"]');
        // const containerWidth = container.getBoundingClientRect().width || 500;
        // const graph = this.template.querySelector('c-stacked-barchart[data-id="dividends-by-quarter-year"]');
   
        // graph.setWidth(containerWidth)
        console.log('resizing is executing')

    }
    
    handleDividendsByQuarterYear(results){
        const dividends = this.transformDividendsToDataset(results);
        const subgroups = this.getGroupsFromDataset(dividends, 'year');
        const groups = dividends.map(element => element.year);

        const graph = this.template.querySelector('c-stacked-barchart[data-id="dividends-by-quarter-year"]');
        this.dividendsByQuarterYearChart = graph;
        


        // window.addEventListener('resize', this.handleDividendsByQuarterYearResize);
        graph.setGroups(groups);
        graph.setSubgroups(subgroups);
        graph.setDataset(dividends);
        graph.setWidth(500);
        graph.setHeight(300);
        
        setTimeout(() => {
            graph.renderChart();
        }
        , 1000);
        
        clearTimeout();
    }
    
    getGroupsFromDataset(dataset, orderBy){
        const groups = [];
        
        if(orderBy == 'year'){
            dataset.forEach(element => {
                const { year, ...subgroups} = element;
                
                for(const key in subgroups){
                    if(!groups.includes(key)){
                        groups.push(key);
                    }
                }
            })
        } else if (orderBy == 'date'){
            dataset.forEach(element => {
                const { date, ...subgroups} = element;
                
                for(const key in subgroups){
                    if(!groups.includes(key)){
                        groups.push(key);
                    }
                }
            })
        }
        
        return groups;
    }
    
    transformInvestmentsToDataset(investments){
        let sortByDate = {}

        investments.forEach(investment => {
            const {Deal, DealCloseDate, TotalAmount} = investment;
            console.log('before break', DealCloseDate);
            const year = DealCloseDate.split('-')[0];
            console.log('after break', DealCloseDate);

            if(!sortByDate[year]){
                sortByDate[year] = [{ Deal, TotalAmount }];
            } else {
                sortByDate[year].push({ Deal, TotalAmount });
            }

        })

        let dataset = [];


        for(const key in sortByDate){
            const set = { date: key }

            sortByDate[key].forEach(investment => {
                const { Deal, TotalAmount } = investment;
                set[Deal] = TotalAmount;
            })

            dataset.push(set);
        }
    
        return dataset;
    }

    transformDividendsToDataset(dividends){
        let sortByYear = {};

        dividends.forEach(dividend => {
            const { Dividends, Deal, QuarterYear} = dividend;
            if(!sortByYear[QuarterYear]){
                sortByYear[QuarterYear] = [{ Dividends, Deal }];
            } else {
                sortByYear[QuarterYear].push({ Dividends, Deal });
            }
        })

        let dataset = [];

        for(const key in sortByYear){
            const set = { year: key }

            sortByYear[key].forEach(dividend => {
                const { Dividends, Deal } = dividend;
                set[Deal] = Dividends;
            })

            dataset.push(set);
        }

        return dataset;
    }

    getSummaryCards(){
        const buildSelector = id => `c-summary-card[data-id="${id}"]`;

        const investmentCard = this.template.querySelector(buildSelector('card-total-invested'));
        const averageCard = this.template.querySelector(buildSelector('card-annualized-return'));
        const dividendsCard = this.template.querySelector(buildSelector('card-paid'));

        return [
            investmentCard,
            averageCard,
            dividendsCard
        ]
    }

    handleSummaryCards(results){
        const [
            investmentCard,
            averageCard,
            dividendsCard
        ] = this.getSummaryCards();

        investmentCard.handleValueChange(this.formatMoney(results[0].investmentSummatory));
        averageCard.handleValueChange(this.formatPercent(results[1].averageFromQR4));
        dividendsCard.handleValueChange(this.formatMoney(results[2].QR4DividendsSummatory));
    }
}