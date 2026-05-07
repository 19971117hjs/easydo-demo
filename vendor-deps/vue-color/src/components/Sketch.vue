<template>
  <div role="application" aria-label="Sketch color picker" :class="['vc-sketch', disableAlpha ? 'vc-sketch__disable-alpha' : '']">
    <div class="vc-sketch-saturation-wrap">
      <saturation v-model="colors" @change="childChange"></saturation>
    </div>
    <div class="vc-sketch-controls">
      <div class="vc-sketch-sliders">
        <div class="vc-sketch-hue-wrap">
          <hue v-model="colors" @change="childChange"></hue>
        </div>
        <div class="vc-sketch-alpha-wrap" v-if="!disableAlpha">
          <alpha v-model="colors" @change="childChange"></alpha>
        </div>
      </div>
      <div class="vc-sketch-color-wrap">
        <div :aria-label="`Current color is ${activeColor}`" class="vc-sketch-active-color" :style="{background: activeColor}"></div>
        <checkboard></checkboard>
      </div>
    </div>
    <div class="vc-sketch-field" v-if="!disableFields">
      <!-- rgba -->
      <div class="vc-sketch-field--double">
        <ed-in label="hex" :value="hex" @change="inputChange"></ed-in>
      </div>
      <div class="vc-sketch-field--single">
        <ed-in label="r" :value="colors.rgba.r" @change="inputChange"></ed-in>
      </div>
      <div class="vc-sketch-field--single">
        <ed-in label="g" :value="colors.rgba.g" @change="inputChange"></ed-in>
      </div>
      <div class="vc-sketch-field--single">
        <ed-in label="b" :value="colors.rgba.b" @change="inputChange"></ed-in>
      </div>
      <div class="vc-sketch-field--single" v-if="!disableAlpha">
        <ed-in label="a" :value="colors.a" :arrow-offset="0.01" :max="1" @change="inputChange"></ed-in>
      </div>
    </div>
    <div class="vc-sketch-eyedropper-container" v-if="eyeDropperEnabled">
      <button class="button" @click="eyedropperClick">
        <div class="svg-icon color-dropper color-dropper-svg"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.0354 5.42882C17.0117 4.45251 18.5946 4.45251 19.5709 5.42882C20.5472 6.40513 20.5472 7.98805 19.5709 8.96436L17.4495 11.0858L17.8032 11.4395C18.389 12.0253 18.389 12.9751 17.8032 13.5609C17.2175 14.1466 16.2677 14.1466 15.6819 13.5609L15.3282 13.2071L10.1069 18.4284C9.83909 18.6963 9.44543 18.781 9.07724 18.6921C7.41594 18.291 6.84309 18.8638 6.84309 18.8638L6.52162 18.5423L6.13599 18.1567C6.13599 18.1567 6.91798 17.3748 6.4676 16.0346C6.32143 15.5996 6.36245 15.1019 6.68691 14.7774L11.7927 9.67161L11.4393 9.31821C10.8535 8.73242 10.8535 7.78268 11.4393 7.19689C12.0251 6.6111 12.9748 6.6111 13.5606 7.19689L13.914 7.55025L16.0354 5.42882ZM16.0353 12.5L16.0355 12.4999L12.4999 8.96435L12.4998 8.96451L12.1464 8.6111C11.9511 8.41584 11.9511 8.09926 12.1464 7.904C12.3417 7.70873 12.6582 7.70873 12.8535 7.904L17.0961 12.1466C17.2914 12.3419 17.2914 12.6585 17.0961 12.8537C16.9009 13.049 16.5843 13.049 16.389 12.8537L16.0353 12.5ZM12.4998 10.3787L12.4903 10.3882L12.4804 10.3982L12.4703 10.4082L12.4603 10.4182L12.4502 10.4283L12.44 10.4385L12.4298 10.4487L12.4195 10.459L12.4092 10.4693L12.3988 10.4797L12.3884 10.4901L12.3779 10.5006L12.3673 10.5112L12.3567 10.5218L12.3461 10.5324L12.3354 10.5431L12.3247 10.5538L12.3139 10.5646L12.303 10.5755L12.2921 10.5864L12.2812 10.5973L12.2702 10.6083L12.2592 10.6194L12.2481 10.6305L12.2369 10.6416L12.2257 10.6528L12.2145 10.664L12.2032 10.6753L12.1919 10.6866L12.1805 10.698L12.1691 10.7094L12.1576 10.7209L12.1461 10.7324L12.1345 10.744L12.1229 10.7556L12.1112 10.7673L12.0995 10.779L12.0878 10.7907L12.076 10.8025L12.0642 10.8143L12.0523 10.8262L12.0404 10.8382L12.0284 10.8501L12.0164 10.8621L12.0043 10.8742L11.9922 10.8863L11.9801 10.8984L11.9679 10.9106L11.9557 10.9228L11.9434 10.9351L11.9311 10.9474L11.9188 10.9597L11.9064 10.9721L11.894 10.9845L11.8815 10.997L11.869 11.0095L11.8565 11.022L11.8439 11.0346L11.8313 11.0472L11.8186 11.0599L11.8059 11.0726L11.7932 11.0853L11.7804 11.0981L11.7676 11.1109L11.7547 11.1238L11.7419 11.1367L11.7289 11.1496L11.716 11.1625L11.703 11.1755L11.69 11.1885L11.6769 11.2016L11.6638 11.2147L11.6507 11.2278L11.6375 11.241L11.6243 11.2542L11.6111 11.2674L11.5978 11.2807L11.5845 11.294L11.5712 11.3074L11.5578 11.3207L11.5444 11.3341L11.531 11.3476L11.5175 11.361L11.504 11.3745L11.4905 11.388L11.4769 11.4016L11.4633 11.4152L11.4497 11.4288L11.4361 11.4424L11.4224 11.4561L11.4087 11.4698L11.3949 11.4836L11.3812 11.4973L11.3674 11.5111L11.3536 11.5249L11.3397 11.5388L11.3258 11.5527L11.3119 11.5666L11.298 11.5805L11.284 11.5945L11.2701 11.6085L11.256 11.6225L11.242 11.6365L11.2279 11.6506L11.2139 11.6647L11.1997 11.6788L11.1856 11.6929L11.1714 11.7071L11.1573 11.7213L11.143 11.7355L11.1288 11.7497L11.1145 11.764L11.1003 11.7783L11.086 11.7926L11.0716 11.8069L11.0573 11.8212L11.0429 11.8356L11.0285 11.85L11.0141 11.8644L10.9997 11.8788L10.9852 11.8933L10.9707 11.9078L10.9562 11.9223L10.9417 11.9368L10.9272 11.9513L10.9126 11.9659L10.8981 11.9804L10.8835 11.995L10.8689 12.0097L10.8542 12.0243L10.8396 12.0389L10.8249 12.0536L10.8102 12.0683L10.7955 12.083L10.7808 12.0977L10.7661 12.1124L10.7513 12.1272L10.7366 12.1419L10.7218 12.1567L10.707 12.1715L10.6922 12.1863L10.6774 12.2011L10.6625 12.216L10.6477 12.2308L10.6328 12.2457L10.6179 12.2606L10.6031 12.2755L10.5881 12.2904L10.5732 12.3053L10.5583 12.3202L10.5434 12.3352L10.5284 12.3501L10.5134 12.3651L10.4985 12.3801L10.4835 12.395L10.4685 12.41L10.4535 12.425L10.4384 12.4401L10.4234 12.4551L10.4084 12.4701L10.3933 12.4852L10.3783 12.5002L10.3632 12.5153L10.3481 12.5304L10.3331 12.5455L10.318 12.5605L10.3029 12.5756L10.2878 12.5907L10.2727 12.6058L10.2576 12.621L10.2424 12.6361L10.2273 12.6512L10.2122 12.6663L10.197 12.6815L10.1819 12.6966L10.1667 12.7118L10.1516 12.7269L10.1364 12.7421L10.1213 12.7572L10.1061 12.7724L10.0909 12.7876L10.0758 12.8027L10.0606 12.8179L10.0454 12.8331L10.0302 12.8483L10.0151 12.8635L9.99988 12.8786L9.9847 12.8938L9.96951 12.909L9.95433 12.9242L9.93914 12.9394L9.92396 12.9546L9.90877 12.9697L9.89359 12.9849L9.87841 13.0001L9.86322 13.0153L9.84804 13.0305L9.83286 13.0457L9.81769 13.0608L9.80251 13.076L9.78734 13.0912L9.77217 13.1063L9.757 13.1215L9.74184 13.1367L9.72668 13.1518L9.71152 13.167L9.69637 13.1821L9.68122 13.1973L9.66608 13.2124L9.65094 13.2276L9.63581 13.2427L9.62069 13.2578L9.60557 13.2729L9.59045 13.2881L9.57534 13.3032L9.56024 13.3183L9.54515 13.3334L9.53007 13.3484L9.51499 13.3635L9.49992 13.3786L9.48485 13.3937L9.4698 13.4087L9.45476 13.4238L9.43972 13.4388L9.4247 13.4538L9.40968 13.4688L9.39468 13.4838L9.37968 13.4988L9.3647 13.5138L9.34972 13.5288L9.33476 13.5438L9.31981 13.5587L9.30487 13.5736L9.28994 13.5886L9.27503 13.6035L9.26012 13.6184L9.24523 13.6333L9.23036 13.6482L9.2155 13.663L9.20065 13.6779L9.18581 13.6927L9.17099 13.7075L9.15619 13.7223L9.1414 13.7371L9.12662 13.7519L9.11186 13.7667L9.09712 13.7814L9.08239 13.7961L9.06768 13.8108L9.05299 13.8255L9.03831 13.8402L9.02365 13.8549L9.00901 13.8695L8.99438 13.8841L8.97977 13.8987L8.96519 13.9133L8.95062 13.9279L8.93607 13.9424L8.92154 13.957L8.90703 13.9715L8.89253 13.986L8.87806 14.0005L8.86361 14.0149L8.84918 14.0293L8.83478 14.0437L8.82039 14.0581L8.80602 14.0725L8.79168 14.0868L8.77736 14.1012L8.76306 14.1155L8.74878 14.1297L8.73453 14.144L8.7203 14.1582L8.7061 14.1724L8.69191 14.1866L8.67776 14.2008L8.66362 14.2149L8.64952 14.229L8.63543 14.2431L8.62138 14.2571L8.60735 14.2712L8.59334 14.2852L8.57936 14.2992L8.56541 14.3131L8.55148 14.327L8.53758 14.3409L8.52371 14.3548L8.50987 14.3686L8.49605 14.3825L8.48227 14.3962L8.46851 14.41L8.45478 14.4237L8.44108 14.4374L8.42741 14.4511L8.41377 14.4647L8.40016 14.4784L8.38658 14.4919L8.37303 14.5055L8.35951 14.519L8.34602 14.5325L8.33257 14.5459L8.31914 14.5594L8.30575 14.5728L8.29239 14.5861L8.27906 14.5995L8.26577 14.6127L8.25251 14.626L8.23928 14.6392L8.22609 14.6524L8.21293 14.6656L8.19981 14.6787L8.18672 14.6918L8.17366 14.7049L8.16064 14.7179L8.14766 14.7309L8.13471 14.7438L8.1218 14.7567L8.10893 14.7696L8.09609 14.7824L8.08329 14.7952L8.07052 14.808L8.0578 14.8207L8.04511 14.8334L8.03246 14.8461L8.01985 14.8587L8.00727 14.8712L7.99474 14.8838L7.98224 14.8963L7.96979 14.9087L7.95738 14.9211L7.945 14.9335L7.93267 14.9458L7.92037 14.9581L7.90812 14.9704L7.89591 14.9826L7.88374 14.9948L7.87162 15.0069L7.85953 15.019L7.84749 15.031L7.83549 15.043L7.82354 15.055L7.81162 15.0669L7.79975 15.0788L7.78793 15.0906L7.77615 15.1024L7.76441 15.1141L7.75272 15.1258L7.74108 15.1374L7.72948 15.149L7.71792 15.1606L7.70642 15.1721L7.69495 15.1836L7.68354 15.195L7.67217 15.2063L7.66085 15.2177L7.64957 15.2289L7.63835 15.2402L7.62717 15.2513L7.61604 15.2625L7.60496 15.2736L7.59393 15.2846L7.58295 15.2956L7.57202 15.3065L7.56113 15.3174L7.5503 15.3282L7.53952 15.339L7.52879 15.3497L7.5181 15.3604L7.50748 15.371L7.4969 15.3816L7.48637 15.3921L7.4759 15.4026L7.46548 15.413L7.45511 15.4234L7.44479 15.4337L7.43453 15.444L7.42432 15.4542L7.41417 15.4643L7.40407 15.4744L7.39724 15.4813C7.39541 15.4856 7.39239 15.4948 7.38995 15.5113C7.38336 15.5557 7.3863 15.6291 7.41551 15.716C7.65776 16.4369 7.64364 17.069 7.52183 17.5772C7.99895 17.5194 8.58975 17.5457 9.31194 17.72C9.34828 17.7288 9.37656 17.7265 9.39195 17.7227C9.39698 17.7215 9.39998 17.7203 9.40152 17.7196L9.41033 17.7108L9.4209 17.7003L9.43152 17.6896L9.44219 17.679L9.45291 17.6682L9.46369 17.6575L9.47452 17.6466L9.4854 17.6358L9.49634 17.6248L9.50732 17.6138L9.51835 17.6028L9.52944 17.5917L9.54058 17.5806L9.55176 17.5694L9.563 17.5582L9.57428 17.5469L9.58562 17.5355L9.597 17.5242L9.60843 17.5127L9.61991 17.5012L9.63144 17.4897L9.64301 17.4781L9.65464 17.4665L9.66631 17.4548L9.67802 17.4431L9.68979 17.4314L9.7016 17.4196L9.71345 17.4077L9.72535 17.3958L9.7373 17.3839L9.74929 17.3719L9.76133 17.3598L9.77341 17.3477L9.78553 17.3356L9.7977 17.3235L9.80991 17.3112L9.82217 17.299L9.83447 17.2867L9.84681 17.2743L9.85919 17.262L9.87162 17.2495L9.88409 17.2371L9.8966 17.2246L9.90915 17.212L9.92174 17.1994L9.93437 17.1868L9.94705 17.1741L9.95976 17.1614L9.97251 17.1486L9.98531 17.1358L9.99814 17.123L10.011 17.1101L10.0239 17.0972L10.0369 17.0843L10.0499 17.0713L10.0629 17.0583L10.0759 17.0452L10.089 17.0321L10.1022 17.019L10.1153 17.0058L10.1286 16.9926L10.1418 16.9794L10.1551 16.9661L10.1684 16.9528L10.1817 16.9394L10.1951 16.926L10.2086 16.9126L10.222 16.8991L10.2355 16.8857L10.249 16.8721L10.2626 16.8586L10.2762 16.845L10.2898 16.8314L10.3034 16.8177L10.3171 16.804L10.3308 16.7903L10.3446 16.7766L10.3584 16.7628L10.3722 16.749L10.386 16.7351L10.3999 16.7212L10.4138 16.7073L10.4278 16.6934L10.4417 16.6794L10.4557 16.6654L10.4697 16.6514L10.4838 16.6374L10.4979 16.6233L10.512 16.6092L10.5261 16.595L10.5403 16.5809L10.5545 16.5667L10.5687 16.5525L10.5829 16.5382L10.5972 16.5239L10.6115 16.5096L10.6258 16.4953L10.6402 16.481L10.6546 16.4666L10.669 16.4522L10.6834 16.4378L10.6978 16.4233L10.7123 16.4088L10.7268 16.3943L10.7413 16.3798L10.7559 16.3653L10.7704 16.3507L10.785 16.3361L10.7996 16.3215L10.8143 16.3069L10.8289 16.2922L10.8436 16.2775L10.8583 16.2628L10.873 16.2481L10.8878 16.2334L10.9025 16.2186L10.9173 16.2038L10.9321 16.189L10.947 16.1742L10.9618 16.1594L10.9767 16.1445L10.9915 16.1296L11.0064 16.1147L11.0213 16.0998L11.0363 16.0849L11.0512 16.0699L11.0662 16.055L11.0812 16.04L11.0962 16.025L11.1112 16.01L11.1262 15.9949L11.1413 15.9799L11.1563 15.9648L11.1714 15.9497L11.1865 15.9346L11.2016 15.9195L11.2168 15.9044L11.2319 15.8893L11.247 15.8741L11.2622 15.859L11.2774 15.8438L11.2926 15.8286L11.3078 15.8134L11.323 15.7982L11.3382 15.7829L11.3535 15.7677L11.3687 15.7524L11.384 15.7372L11.3992 15.7219L11.4145 15.7066L11.4298 15.6913L11.4451 15.676L11.4604 15.6607L11.4758 15.6454L11.4911 15.6301L11.5064 15.6147L11.5218 15.5994L11.5371 15.584L11.5525 15.5686L11.5679 15.5533L11.5833 15.5379L11.5987 15.5225L11.614 15.5071L11.6294 15.4917L11.6449 
        15.4763L11.6603 15.4609L11.6757 15.4455L11.6911 15.43L11.7065 15.4146L11.722 15.3992L11.7374 15.3837L11.7529 15.3683L11.7683 15.3529L11.7838 15.3374L11.7992 15.322L11.8147 15.3065L11.8301 15.291L11.8456 15.2756L11.861 15.2601L11.8765 15.2446L11.892 15.2292L11.9074 15.2137L11.9229 15.1982L11.9384 15.1828L11.9539 15.1673L11.9693 15.1518L11.9848 15.1364L12.0003 15.1209L12.0157 15.1054L12.0312 15.09L12.0467 15.0745L12.0621 15.059L12.0776 15.0436L12.0931 15.0281L12.1085 15.0126L12.124 14.9972L12.1394 14.9817L12.1549 14.9663L12.1703 14.9508L12.1858 14.9354L12.2012 14.92L12.2166 14.9045L12.2321 14.8891L12.2475 14.8737L12.2629 14.8583L12.2783 14.8428L12.2937 14.8274L12.3091 14.812L12.3245 14.7967L12.3399 14.7813L12.3553 14.7659L12.3706 14.7505L12.386 14.7352L12.4014 14.7198L12.4167 14.7044L12.432 14.6891L12.4474 14.6738L12.4627 14.6585L12.478 14.6431L12.4933 14.6278L12.5086 14.6126L12.5239 14.5973L12.5392 14.582L12.5544 14.5667L12.5697 14.5515L12.5849 14.5363L12.6001 14.521L12.6153 14.5058L12.6305 14.4906L12.6457 14.4754L12.6609 14.4603L12.6761 14.4451L12.6912 14.4299L12.7063 14.4148L12.7215 14.3997L12.7366 14.3846L12.7517 14.3695L12.7667 14.3544L12.7818 14.3394L12.7968 14.3243L12.8119 14.3093L12.8269 14.2943L12.8419 14.2793L12.8569 14.2643L12.8718 14.2493L12.8868 14.2344L12.9017 14.2194L12.9166 14.2045L12.9315 14.1896L12.9464 14.1748L12.9612 14.1599L12.9761 14.1451L12.9909 14.1303L13.0057 14.1155L13.0205 14.1007L13.0352 14.0859L13.05 14.0712L13.0647 14.0565L13.0794 14.0418L13.094 14.0271L13.1087 14.0125L13.1233 13.9978L13.1379 13.9832L13.1525 13.9686L13.1671 13.9541L13.1816 13.9395L13.1961 13.925L13.2106 13.9105L13.2251 13.8961L13.2395 13.8816L13.254 13.8672L13.2684 13.8528L13.2827 13.8384L13.2971 13.8241L13.3114 13.8098L13.3257 13.7955L13.34 13.7812L13.3542 
        13.767L13.3684 13.7527L13.3826 13.7386L13.3968 13.7244L13.4109 13.7103L13.425 13.6962L13.4391 13.6821L13.4531 13.6681L13.4671 13.654L13.4811 13.64L13.4951 13.6261L13.509 13.6122L13.5229 13.5983L13.5368 13.5844L13.5506 13.5706L13.5644 13.5567L13.5782 13.543L13.5919 13.5292L13.6056 13.5155L13.6193 13.5018L13.633 13.4882L13.6466 13.4746L13.6602 13.461L13.6737 13.4474L13.6872 13.4339L13.7007 13.4205L13.7142 13.407L13.7276 13.3936L13.7409 13.3802L13.7543 13.3669L13.7676 13.3536L13.7809 13.3403L13.7941 13.3271L13.8073 13.3139L13.8205 13.3007L13.8336 13.2876L13.8467 13.2745L13.8597 13.2614L13.8728 13.2484L13.8857 13.2354L13.8987 13.2225L13.9116 13.2096L13.9244 13.1967L13.9373 13.1839L13.95 13.1711L13.9628 13.1584L13.9755 13.1457L13.9881 13.133L14.0008 13.1204L14.0134 13.1078L14.0259 13.0953L14.0384 13.0828L14.0509 13.0703L14.0633 13.0579L14.0756 13.0455L14.088 13.0332L14.1003 13.0209L14.1125 13.0086L14.1247 12.9964L14.1369 12.9843L14.149 12.9722L14.1611 12.9601L14.1731 12.9481L14.1851 12.9361L14.197 12.9242L14.2089 12.9123L14.2207 12.9004L14.2325 12.8886L14.2443 12.8769L14.256 12.8652L14.2677 12.8535L14.2793 12.8419L14.2908 12.8303L14.3023 12.8188L14.3138 12.8073L14.3252 12.7959L14.3366 12.7845L14.3479 12.7732L14.3592 12.762L14.3704 12.7507L14.3816 12.7396L14.3927 12.7284L14.4038 12.7174L14.4148 12.7063L14.4258 12.6954L14.4367 12.6844L14.4476 12.6736L14.4584 12.6628L14.4692 12.652L14.4799 12.6413L14.4905 12.6306L14.5012 12.62L14.5117 12.6095L14.5222 12.599L14.5327 12.5885L14.543 12.5781L14.5534 12.5678L14.5637 12.5575L14.5739 12.5473L14.5841 12.5371L14.5942 12.527L14.6042 12.5169L14.6143 12.5069L14.6211 12.5L12.4998 10.3787ZM6.13599 18.1567L5.78243 18.5103C5.58717 18.7056 5.58717 19.0221 5.78243 19.2174C5.97769 19.4127 6.29428 19.4127 6.48954 19.2174L6.84309 18.8638L6.48954 18.5103L6.13599 18.1567ZM18.8638 8.25725L16.7424 10.3787L14.6211 8.25736L16.7425 6.13593C17.3283 5.55014 18.278 5.55014 18.8638 6.13593C19.4496 6.72172 19.4496 7.67146 18.8638 8.25725ZM7.3977 15.4802C7.39859 15.479 7.39893 15.4783 7.39888 15.4782C7.39885 15.4781 7.39867 15.4784 7.39837 15.4789C7.39818 15.4792 7.39796 15.4797 7.3977 15.4802Z"></path></svg>
        </div>Pick color</button>
    </div>
    <div  v-if="!disablePresets">
      <div v-bind:class="{deleting: isShiftPressed, 'vc-sketch-presets': true}" role="group" aria-label="A color preset, pick one to set as current color">
        <template v-for="(c,i) in colorPalette">
          <div
            v-if="!isTransparent(c)"
            class="vc-sketch-presets-color"
            :aria-label="'Color:' + c"
            :key="i + c"
            :style="{background: c}"
            @click="handlePreset(c, i)">
          </div>
          <div
            v-else
            :key="i + c"
            :aria-label="'Color:' + c"
            class="vc-sketch-presets-color"
            @click="handlePreset(c, i)">
            <checkboard />
          </div>
        </template>
          <div
            class="vc-sketch-presets-color addNew special"
            aria-label="Add new"
            key="addNew"
            @click="handlePreset('addNew')">
            +
          </div>
      </div>
      <div class="hintRemove" v-if="colorPalette.length > 0">
        {{hintRemove}}
      </div>
    </div>
  </div>
</template>

<script>
import colorMixin from '../mixin/color'
import editableInput from './common/EditableInput.vue'
import saturation from './common/Saturation.vue'
import hue from './common/Hue.vue'
import alpha from './common/Alpha.vue'
import checkboard from './common/Checkboard.vue'

// const presetColors = [
//   '#D0021B', '#F5A623', '#F8E71C', '#8B572A', '#7ED321',
//   '#417505', '#BD10E0', '#9013FE', '#4A90E2', '#50E3C2',
//   '#B8E986', '#000000', '#4A4A4A', '#9B9B9B', '#FFFFFF',
//   'rgba(0,0,0,0)'
// ]

export default {
  name: 'Sketch',
  mixins: [colorMixin],
  components: {
    saturation,
    hue,
    alpha,
    'ed-in': editableInput,
    checkboard
  },
  props: {
    presetColors: {
      type: Array,
      default () {
        return []
      }
    },
    disablePresets: {
      type: Boolean,
      default: true
    },
    disableAlpha: {
      type: Boolean,
      default: false
    },
    disableFields: {
      type: Boolean,
      default: false
    },
    onPresetChange: {
      type: Function,
      default: ()=>{}
    },
    hintRemove: {
      type: String,
      default: 'Shift+click to remove color'
    }
  },
  computed: {
    hex () {
      let hex
      if (this.colors.a < 1) {
        hex = this.colors.hex8
      } else {
        hex = this.colors.hex
      }
      return hex.replace('#', '')
    },
    activeColor () {
      var rgba = this.colors.rgba
      return 'rgba(' + [rgba.r, rgba.g, rgba.b, rgba.a].join(',') + ')'
    }
  },
  mounted: function() {
    document.addEventListener('keydown', this.handleKeyEvent);
    document.addEventListener('keyup', this.handleKeyEvent);
  },
  beforeDestroy: function() {
    document.removeEventListener('keydown', this.handleKeyEvent);
    document.removeEventListener('keyup', this.handleKeyEvent);
  },
  data() {
    return {
      isShiftPressed: false,
      picking: false,
      colorPalette: this.presetColors || [],
      eyeDropperEnabled: ("EyeDropper" in window)
    }
  },
  methods: {
    handleKeyEvent(event) {
      this.isShiftPressed = !!event.shiftKey;
    },
    eyedropperClick() {
      if(this.picking) {
        return;
      }
      this.picking = true;
      let eyeDropper = new EyeDropper();

      eyeDropper
        .open()
        .then((colorSelectionResult) => {
          this.picking = false
               this.colorChange({
                hex: colorSelectionResult.sRGBHex,
                source: 'hex'
              })
        }).catch(() => {
          this.picking = false
        }).finally(() => {
          this.picking = false
        })
    },
    filterValid(_colors) {
      const colors = Array.isArray(_colors) ? _colors : [];
      return colors.filter((c) => this.isValidHex(c) )
    },
    handlePreset (c, i) {
      if(this.isShiftPressed) {
        if(c == 'addNew') {
          return;
        }
        this.colorPalette.splice(i, 1);
        this.onPresetChange( this.colorPalette);
        return;
      }
      if(c == 'addNew') {
        this.colorPalette.push('#' + this.hex)
        this.onPresetChange( this.colorPalette);
        return;
      }
      this.colorChange({
        hex: c,
        source: 'hex'
      })
    },
    childChange (data) {
      this.colorChange(data)
    },
    inputChange (data) {
      if (!data) {
        return
      }
      if (data.hex) {
        this.isValidHex(data.hex) && this.colorChange({
          hex: data.hex,
          source: 'hex'
        })
      } else if (data.r || data.g || data.b || data.a) {
        this.colorChange({
          r: data.r || this.colors.rgba.r,
          g: data.g || this.colors.rgba.g,
          b: data.b || this.colors.rgba.b,
          a: data.a || this.colors.rgba.a,
          source: 'rgba'
        })
      }
    }
  }
}
</script>

<style>
.vc-sketch {
  position: relative;
  width: 200px;
  padding: 10px;
  box-sizing: initial;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .15), 0 8px 16px rgba(0, 0, 0, .15);
}

.vc-sketch-saturation-wrap {
  width: 100%;
  padding-bottom: 75%;
  position: relative;
  overflow: hidden;
}

.vc-sketch-controls {
  display: flex;
}

.vc-sketch-sliders {
  padding: 4px 0;
  flex: 1;
}

.vc-sketch-sliders .vc-hue,
.vc-sketch-sliders .vc-alpha-gradient {
  border-radius: 2px;
}

.vc-sketch-hue-wrap {
  position: relative;
  height: 10px;
}

.vc-sketch-alpha-wrap {
  position: relative;
  height: 10px;
  margin-top: 4px;
  overflow: hidden;
}

.vc-sketch-color-wrap {
  width: 24px;
  height: 24px;
  position: relative;
  margin-top: 4px;
  margin-left: 4px;
  border-radius: 3px;
}

.vc-sketch-active-color {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .15), inset 0 0 4px rgba(0, 0, 0, .25);
  z-index: 2;
}

.vc-sketch-color-wrap .vc-checkerboard {
  background-size: auto;
}

.vc-sketch-eyedropper-container .button {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 10px 0;
  padding-left: 6px;

  border: 1px solid #ccc;
  border-radius: 6px;
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 400;
  text-align: center;
  line-height: 1;
  min-height: 30px;
  outline: none;
  white-space: nowrap;
  color: #222;
  position: relative;
  cursor: pointer;
}
.vc-sketch-eyedropper-container .button .svg-icon{
  width: 22px !important;
  height: 22px !important;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
}
.vc-sketch-eyedropper-container .button .svg-icon svg{
  width: inherit;
  fill: #222 !important;
}
.vc-sketch-field {
  display: flex;
  padding-top: 4px;
}

.vc-sketch-field .vc-input__input {
  width: 90%;
  padding: 4px 0 3px 10%;
  border: none;
  box-shadow: inset 0 0 0 1px #ccc;
  font-size: 10px;
}

.vc-sketch-field .vc-input__label {
  display: block;
  text-align: center;
  font-size: 11px;
  color: #222;
  padding-top: 3px;
  padding-bottom: 4px;
  text-transform: capitalize;
}

.vc-sketch-field--single {
  flex: 1;
  padding-left: 6px;
}

.vc-sketch-field--double {
  flex: 2;
}

.vc-sketch-presets {
  margin-right: -10px;
  margin-left: -10px;
  padding-left: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
  user-select: none;
}
.vc-sketch-presets.deleting {
  background: rgba(238, 238, 238, 0.3);
}

.vc-sketch-presets.deleting .vc-sketch-presets-color:not(.special):after {
  content: 'x';
  font-size: 15px;
  color: white;
  position: relative;
  top: -5px;
  left: 4px;
}
.vc-sketch-presets-color {
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  display: inline-block;
  margin: 0 10px 10px 0;
  vertical-align: top;
  cursor: pointer;
  width: 16px;
  height: 16px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .15);
}

.vc-sketch-presets-color .vc-checkerboard {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .15);
  border-radius: 3px;
}
.vc-sketch-presets-color.addNew{
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  user-select: none;
}
.vc-sketch__disable-alpha .vc-sketch-color-wrap {
  height: 10px;
}
.vc-sketch .hintRemove{
  font-size: 11px;
  text-align: center;
  padding-bottom: 5px;
}
</style>
