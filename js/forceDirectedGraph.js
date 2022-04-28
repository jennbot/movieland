class ForceDirectedGraph {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 700,
      containerHeight: 700,
      margin: { top: 0, right: 20, bottom: 20, left: 35 },
    };
    this.data = _data;
    this.movieList = [];
    this.dispatcher = _dispatcher;
    this.initVis();
  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.config.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.config.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    // Initialize scales
    vis.colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // Append group element that will contain our actual chart
    // and position it according to the given margin config
    vis.chart = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    // Initialize force simulation
    vis.simulation = d3
      .forceSimulation()
      .force(
        'link',
        d3
          .forceLink()
          .id((d) => d.id)
          .distance(20)
      )
      .force('charge', d3.forceManyBody().strength(-4))
      .force(
        'collision',
        d3.forceCollide().radius(function (d) {
          return d.radius;
        })
      )
      .force(
        'center',
        d3.forceCenter(vis.config.width / 2, vis.config.height / 2)
      );

    let svg = d3.select('#my_dataviz');

    // Handmade legend
    // https://d3-graph-gallery.com/graph/custom_legend.html
    svg
      .append('circle')
      .attr('cx', 200)
      .attr('cy', 120)
      .attr('r', 3)
      .style('fill', d3.schemeCategory10[0]);
    svg
      .append('text')
      .attr('x', 210)
      .attr('y', 124)
      .text('Actor')
      .style('font-size', '13px')
      .attr('alignment-baseline', 'middle');
    svg
      .append('circle')
      .attr('cx', 260)
      .attr('cy', 120)
      .attr('r', 3)
      .style('fill', d3.schemeCategory10[1]);
    svg
      .append('text')
      .attr('x', 270)
      .attr('y', 124)
      .text('Director')
      .style('font-size', '13px')
      .attr('alignment-baseline', 'middle');

    vis.updateVis();
  }

  /**
   * Prepare the data and scales before we render it.
   */
  updateVis() {
    let vis = this;
    vis.data = forceData;

    // Add node-link data to simulation
    vis.simulation.nodes(vis.data.nodes);
    vis.simulation.force('link').links(vis.data.links);

    if (filterChange) {
      vis.simulation.alpha(1).alphaTarget(0).restart();
    }

    vis.colorScale.domain(vis.data.nodes.map((d) => d.group));
    // select the svg area

    vis.renderVis();
  }

  /**
   * Bind data to visual elements.
   */
  renderVis() {
    let vis = this;

    // Add links
    const links = vis.chart
      .selectAll('line')
      .data(vis.data.links, (d) => {
        return [d.source, d.target];
      })
      .join('line')
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)
      .attr('stroke-width', 5)

      .attr('class', (d) => {
        if (
          selectedPoints.includes(d.source.id) ||
          selectedPoints.includes(d.target.id)
        ) {
          return 'connection activeLink';
        } else {
          return 'connection';
        }
      });

    // Add nodes
    const nodes = vis.chart
      .selectAll('circle')
      .data(vis.data.nodes, (d) => d.id)
      .join('circle')
      .attr('r', function (d) {
        if (selectedPoints.includes(d.id.toLowerCase())) {
          return 8;
        } else {
          return 6;
        }
      })
      .attr('fill', (d) => vis.colorScale(d.group))
      .style('opacity', 0.7)
      .attr('class', (d) => {
        if (selectedPoints.includes(d.id.toLowerCase())) {
          return 'node activeNode';
        } else {
          return 'node';
        }
      });

    // Update positions
    vis.simulation.on('tick', () => {
      links
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      nodes.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    });

    //https://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3

    //group 1 = director
    //group 2 = actor
    nodes.on('click', function (event, d) {
      event.stopPropagation();
      //Deselect Histogram
      rate = [];
      vis.dispatcher.call('deselectHistogram', event);

      // Deselect circular chart link
      if (!forceClicked) {
        filterChange = false;
        forceClicked = true;
        renderSelected();
      } else {
        filterChange = false;
        forceClicked = false;
      }
      if (selectedPoints.includes(d.id.toLowerCase())) {
        selectedPoints = [];
      } else {
        selectedPoints = [d.id.toLowerCase()];
      }
      renderSelected();
    });

    nodes.raise();

    nodes
      .on('mouseover', (event, d) => {
        if (d.group === 1) {
          this.movieList = movieByDirector.get(d.id);
        } else if (d.group === 2) {
          this.movieList = movieByActor.get(d.id);
        }
        // https://stackoverflow.com/questions/46141450/create-li-from-loop-through-array-and-display-to-html-as-a-list
        var str = '<ul>';
        this.movieList.forEach(function (slide) {
          str += '<li>' + slide.name + ': ' + slide.score + '</li>';
        });
        str += '</ul>';

        d3
          .select('#force-tooltip')
          .style('left', event.pageX + 15 + 'px')
          .style('display', 'block')
          .style('top', event.pageY + 'px').html(`
              <div class="tooltip-title">${d.id}</div>
              <ul>
                ${str}
              </ul>
            `);
      })
      .on('mouseleave', () => {
        d3.select('#force-tooltip').style('display', 'none');
      });
  }
}
