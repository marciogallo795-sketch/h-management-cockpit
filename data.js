window.H_DEFAULT_DATA = {
  pipeline: [],
  backlog: [],
  delivery: [],
  recurring: [],
  expansion: [],
  cashflow: [],
  meetings: []
};

window.H_CONFIG = {
  stages: [
    {id:"S0", label:"Radar"},
    {id:"S1", label:"Qualifica"},
    {id:"S2", label:"Discovery"},
    {id:"S3", label:"Proposta"},
    {id:"S4", label:"Commit"},
    {id:"S5", label:"Backlog"},
    {id:"S6", label:"Delivery"},
    {id:"S7", label:"Expand"}
  ],
  health: ["Verde","Amarelo","Vermelho"],
  expansionTypes: ["Nova Wave","Escopo Adjacente","Advisory","PMO","TMO","Retainer","Sustentação","Indicação","Outro"]
};