export const state = {
  templateCount: 1,
  preset: 'center',
  images: [],
  selectedImages: [],
  mainTitle: '',
  subTitle: '',
  titleColor: '#ffffff',
  subtitleColor: '#ffffff',
  bgColor: '#f5f5f5',
  titleSize: 48,
  shadow: true,
  stroke: false,
  bold: true,
  textBg: false,
  imageGap: 4,
  imageRadius: 0,
  pendingImageSettings: null,
  twoImageStyle: 'split',
  fiveImageStyle: 'normal',
  sixImageStyle: 'normal',
  circlePosition: 'right',
  circleSize: 300,
  circleBorderColor: '#ffffff',
  circleBorderWidth: 8,
  maskStyle: 'normal',
  maskTitle: 'EASY TO USE',
  maskTexts: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  maskBgColor: '#1a1a2e',
  maskCardColor: '#a8b4c6',
  maskNumberBg: '#6b7aa1',
  maskTextColor: '#ffffff',
  detailTitle: 'DETAILS',
  detailSubtitle: 'THEME COPY',
  detailText1Title: '01.DETAILS',
  detailText2Title: '02.DETAILS',
  detailText1Desc: 'Here are some of the more complex',
  detailText2Desc: 'Here are some of the more complex',
  detailBgColor: '#f0f0f0',
  detailCardColor: '#c8c8c8',
  detailTitleColor: '#888888',
  detailTextColor: '#666666',
  cardTitle: 'Original Color Presented',
  cardSubtitle: 'The Pattern is presented 100% original color as on the computer',
  cardBgColor: '#f5f5f5',
  cardRadius: 24,
  cardTitleColor: '#333333',
  cardSubtitleColor: '#666666',
  logo: null,
  logoColor: '#ffffff',
  logoSize: 150,
  logoMargin: 40,
  dimEnabled: false,
  dimensions: [],
  selectedDimId: null,
  dimColor: '#ff6b6b',
  dimLineW: 2,
  dimFontS: 16,
  dimTextColor: '#ff6b6b',
  dimEndStyle: 'arrow',
  dimTextBg: 'white',
  dimFirstPoint: null,
  dragState: {
    isDragging: false,
    dragIndex: -1,
    dropIndex: -1,
    startX: 0,
    startY: 0
  }
};

export function resetState() {
  state.templateCount = 1;
  state.preset = 'center';
  state.images = [];
  state.selectedImages = [];
  state.mainTitle = '';
  state.subTitle = '';
  state.titleColor = '#ffffff';
  state.subtitleColor = '#ffffff';
  state.bgColor = '#f5f5f5';
  state.titleSize = 48;
  state.shadow = true;
  state.stroke = false;
  state.bold = true;
  state.textBg = false;
  state.imageGap = 4;
  state.imageRadius = 0;
  state.pendingImageSettings = null;
  state.twoImageStyle = 'split';
  state.fiveImageStyle = 'normal';
  state.sixImageStyle = 'normal';
  state.circlePosition = 'right';
  state.circleSize = 300;
  state.circleBorderColor = '#ffffff';
  state.circleBorderWidth = 8;
  state.maskStyle = 'normal';
  state.maskTitle = 'EASY TO USE';
  state.maskTexts = ['Step 1', 'Step 2', 'Step 3', 'Step 4'];
  state.maskBgColor = '#1a1a2e';
  state.maskCardColor = '#a8b4c6';
  state.maskNumberBg = '#6b7aa1';
  state.maskTextColor = '#ffffff';
  state.detailTitle = 'DETAILS';
  state.detailSubtitle = 'THEME COPY';
  state.detailText1Title = '01.DETAILS';
  state.detailText2Title = '02.DETAILS';
  state.detailText1Desc = 'Here are some of the more complex';
  state.detailText2Desc = 'Here are some of the more complex';
  state.detailBgColor = '#f0f0f0';
  state.detailCardColor = '#c8c8c8';
  state.detailTitleColor = '#888888';
  state.detailTextColor = '#666666';
  state.cardTitle = 'Original Color Presented';
  state.cardSubtitle = 'The Pattern is presented 100% original color as on the computer';
  state.cardBgColor = '#f5f5f5';
  state.cardRadius = 24;
  state.cardTitleColor = '#333333';
  state.cardSubtitleColor = '#666666';
  state.logo = null;
  state.logoColor = '#ffffff';
  state.logoSize = 150;
  state.logoMargin = 40;
  state.dimEnabled = false;
  state.dimensions = [];
  state.selectedDimId = null;
  state.dimColor = '#ff6b6b';
  state.dimLineW = 2;
  state.dimFontS = 16;
  state.dimTextColor = '#ff6b6b';
  state.dimEndStyle = 'arrow';
  state.dimTextBg = 'white';
  state.dimFirstPoint = null;
  state.dragState = {
    isDragging: false,
    dragIndex: -1,
    dropIndex: -1,
    startX: 0,
    startY: 0
  };
}
