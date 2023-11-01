import { LightningElement, track, api } from 'lwc';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {loadScript} from 'lightning/platformResourceLoader';
import D3 from '@salesforce/resourceUrl/D3js';

export default class LinearChart extends LightningElement {
  @track data = null;
  @track height = null;
  @track width = null;
  @track limit = 0;

  @api title = null;

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

  renderLineChart(){
    const margin = { t: 10, r: 30, b: 30, l: 60 }

    d3.select(this.template.querySelector('.linearchart')).selectAll('*').remove();

    const svg = d3.select(this.template.querySelector('.linearchart'))
                  .append('svg')
                    .attr("width", this.width + margin.l + margin.r)
                    .attr("height", this.height + margin.t + margin.b)
                  .append("g")
                    .attr('transform',
                          'translate(' + margin.l + ',' + margin.t + ')');

    const x = d3.scaleTime()
                  .domain(d3.extent(this.data, d => new Date(d.date))) // Parse date strings into Date objects
                  .range([0, this.width]);
    svg.append('g')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(d3.axisBottom(x));

    const maxValue = d3.max(this.data, d => d.value);
    const maxDomainHeight = maxValue + 5 > 100 ? maxValue : maxValue + 5;

    const y = d3.scaleLinear()
                .domain([0, maxDomainHeight])
                .range([this.height, 0]);
    svg.append('g')
        .call(d3.axisLeft(y));

    svg.append('path')
        .datum(this.data)
        .attr('fill', 'none')
        .attr('stroke', '#69b3a2')
        .attr('stroke-width', 1.5)
        .attr('d', d3.line()
                    .x(d => x(new Date(d.date) ))
                    .y(d => y(d.value))
        );

    // Limit line for 2% cash on cash should be a dashed line with the color #69b3a2
    svg.append("line")
    .attr("x1", x(x.domain()[0]))
    .attr("y1", y(this.limit))
    .attr("x2", x(x.domain()[1]))
    .attr("y2", y(this.limit))
    .attr("stroke", "#69b3a2")
    .attr("stroke-dasharray", "5,5"); // Set the dash pattern
  }

  @api renderChart(){
    this.renderLineChart();
  }

  @api setDataset(dataset){
    this.data = dataset;
  }

  @api setHeight(height){
    this.height = height;
  }

  @api setWidth(width){
    this.width = width;
  }

  @api setLimit(limit){
    this.limit = limit;
  }

}