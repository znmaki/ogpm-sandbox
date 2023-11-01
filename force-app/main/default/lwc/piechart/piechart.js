import { LightningElement, track, api } from 'lwc';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {loadScript} from 'lightning/platformResourceLoader';
import D3 from '@salesforce/resourceUrl/D3js';


export default class Piechart extends LightningElement {
    @track data = null
    @track height = null
    @track width = null
    format = 'Percent'
    groups = null

    @api title = null

    palette = [
        "#2F00FF", "#B7A2D7", "#1E1926","#362B48", "#3A9CB8", "#2D6577", "#B1CBD4", "#006B47"
    ]
    colorIndex = 0;

    d3Initialized = false;
    dataInitialized = this.data != null;

    renderedCallback(){
        if(this.d3Initialized) return;

        this.d3Initialized = true;

        loadScript(this, D3 + '/d3.min.js')
            .then(() => {
                if(!this.dataInitialized) return;
                this.renderChart();
            })
            .catch(errors => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error loading D3',
                        message: errors.message,
                        variant: 'error'
                    })
                );
            })
        }

    generateColorPalette(number){
        const palette = [];
    
        for(let i = 0; i < number; i++){
            palette.push(this.palette[this.colorIndex]);
            this.colorIndex++;
        }
    
        return palette
    }

    generatePieChart({mouseover, mousemove, mouseleave}){
        d3.select(this.template.querySelector('.piechart')).selectAll('*').remove();
    
        const svg = d3.select(this.template.querySelector('.piechart'))
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g')
            .attr('transform', `translate(${this.width/2}, ${this.height/2})`);
    
        const pie = d3.pie().value(d => d.value);
    
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(Math.min(this.width, this.height) / 2 - 1);
    
        svg.selectAll('path')
            .data(pie(this.data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', (_d, i) => this.palette[i])
            .attr('stroke', 'white')
            .style('stroke-width', '2px')
            .on('mouseover', mouseover)
            .on('mousemove', mousemove)
            .on('mouseleave', mouseleave)
    }

    generateTooltip() {
        // Select the tooltip element from your component's markup
        const tooltip = d3.select(this.template.querySelector('.tooltip'));
    
        const mouseover = function(d) {
            tooltip.style("opacity", 0.8);
            d3.select(this).style("opacity", 0.5);
        };
    
        const mousemove = (event, d) => {
            const formatter = d3.format(","); // Format tooltip content as needed
                
            tooltip
                .html(`${formatter(d.value)}%`) // Set tooltip content
                .style("left", event.pageX + 10 + "px") // Adjust tooltip position
                .style("top", event.pageY - 10 + "px"); // Adjust tooltip position
        };
    
        const mouseleave = function(d) {
            tooltip.style("opacity", 0);
            d3.select(this).style("opacity", 1);
        };
    
        return { mouseover, mousemove, mouseleave };
    }

    generateLegends(color){
        const legendContainer = d3.select(this.template.querySelector('.legend-container'));
        const legend = legendContainer.append('ul')
            .attr('class', 'legend');
    
        const legendItems = legend.selectAll('li')
            .data(this.groups)
            .enter()
            .append('li')
            .append('div')
            .attr('class', 'legend-item');  
    
        legendItems.append('span')
            .text('□□')
            .attr('class', 'legend-color-box') // Update class to 'legend-color-box'
            .style('background-color', (d, i) => this.palette[i])
            .style('color', 'transparent')
    
        legendItems.append('span')
            .attr('class', 'legend-label')
            .text((d) => '  ' + d);
      }

    formatData(data){
        if(this.format == 'Percent'){
            const total = data.reduce((acc, cur) => acc + cur.value, 0);

            // add that the number is only 2 decimals
            data.forEach(d => d.value = parseFloat((d.value / total * 100).toFixed(2)));
        }

        return data;
    }

    @api renderChart(){
        const {mouseover, mousemove, mouseleave} = this.generateTooltip();
        this.generatePieChart({mouseover, mousemove, mouseleave});
        this.generateLegends();
    }

    @api setDataset(dataset){
        this.data = this.formatData(dataset);
        this.groups = dataset.map(d => d.label);
    }

    @api setHeight(height){
        this.height = height;
    }

    @api setWidth(width){
        this.width = width;
    }
    
}