// Constants

const xsltDoc = new DOMParser().parseFromString(
  `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
      <xsl:strip-space elements="*"/>
      <xsl:template match="para[content-style][not(text())]">
        <xsl:value-of select="normalize-space(.)"/>
      </xsl:template>
      <xsl:template match="node()|@*">
        <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
      </xsl:template>
      <xsl:output indent="yes"/>
    </xsl:stylesheet>`,
  'application/xml'
);

// Functions

const prettifyXml = (xmlDoc) => {
  const xsltProcessor = new XSLTProcessor();
  xsltProcessor.importStylesheet(xsltDoc);
  return xsltProcessor.transformToDocument(xmlDoc);
};

const saveXmlFile = (xmlDoc, filename) => {
  var blob = new Blob([new XMLSerializer().serializeToString(prettifyXml(xmlDoc))], {
    type: 'application/xml',
  });

  saveAs(blob, filename);
};

const createInputBlock = (entity) => {
  const div = document.createElement('div');
  div.classList.add('input-block');
  div.innerHTML = `<div class="input-group-name">${entity.name}</div>`;

  const container = document.createElement('div');
  container.classList.add('input-container');

  div.appendChild(container);

  const delGroup = (group) => {
    entity.groups = entity.groups.filter((x) => x !== group);
  };

  const createInputs = () =>
    entity.groups.map((x) => {
      const inputTemp = document.createElement('input');
      inputTemp.value = x;
      inputTemp.onchange = () => {
        const index = entity.groups.indexOf(x);
        if (index !== -1) {
          entity.groups[index] = inputTemp.value;
        }
      };
      const delButton = document.createElement('button');
      delButton.innerText = 'Delete';
      delButton.classList.add('delete', 'button');
      delButton.onclick = () => {
        delGroup(x);
        render();
      };

      const res = document.createElement('div');
      res.classList.add('input-line');
      res.appendChild(inputTemp);
      res.appendChild(delButton);
      return res;
    });

  const render = () => {
    const inputs = createInputs();
    container.innerText = '';
    for (const inputTemp of inputs) {
      container.appendChild(inputTemp);
    }
    const addButton = document.createElement('button');
    addButton.innerText = 'Add new';
    addButton.classList.add('add', 'button');
    addButton.onclick = () => {
      entity.groups = [...entity.groups, ''];
      render();
    };
    container.appendChild(addButton);
  };

  render();
  return div;
};

const input = document.getElementById('fileinput');
const mapper = document.getElementById('mapper');
const finish = document.getElementById('finish');
const dropTitle = document.getElementById('droptitle');

const dropContainer = document.getElementById('dropcontainer');

dropContainer.addEventListener('dragover', (e) => e.preventDefault(), false);

dropContainer.addEventListener('dragenter', () => {
  dropContainer.classList.add('drag-active');
});

dropContainer.addEventListener('dragleave', () => {
  dropContainer.classList.remove('drag-active');
});

dropContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  dropContainer.classList.remove('drag-active');
  input.files = e.dataTransfer.files;
  dropTitle.innerText = input.files[0].name;
  start();
});

input.onchange = () => {
  dropTitle.innerText = input.files[0].name;
  start();
};

const start = () => {
  const file = input.files[0];
  var reader = new FileReader();
  reader.readAsText(file, 'UTF-8');

  let xmlDoc;
  let entities;

  reader.onload = (e) => {
    const text = e.target.result;
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(text, 'application/xml');

    const oldNodes = Array.from(xmlDoc.getElementsByTagName('Course'));

    entities = oldNodes
      .map((x) => ({
        course: x,
        name: x.getElementsByTagName('CourseName')[0].textContent,
      }))
      .map((x) => ({
        ...x,
        groups: x.name.split(/;|,|\./).map((y) => y.trim()),
      }));

    const blocks = entities.map(createInputBlock);
    mapper.innerText = '';
    mapper.append(...blocks);

    finish.style.display = 'block';
  };

  finish.onclick = () => {
    if (!entities) {
      return;
    }
    const newNodes = entities.flatMap((x) =>
      x.groups.map((y) => {
        const element = x.course.cloneNode(true);
        element.getElementsByTagName('CourseName')[0].textContent = y;
        return element;
      })
    );

    for (const node of Array.from(xmlDoc.getElementsByTagName('Course'))) {
      xmlDoc.documentElement.removeChild(node);
    }

    for (const node of newNodes) {
      xmlDoc.documentElement.appendChild(node);
    }

    saveXmlFile(xmlDoc, `${file.name.replace(/\.[^/.]+$/, '')}_updated.xml`);
  };
};
