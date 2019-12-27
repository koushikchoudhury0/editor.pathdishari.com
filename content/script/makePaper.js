class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

const SOLUTION_TYPE_MCQ = 1, SOLUTION_TYPE_DESCRIPTIVE = 2;
const defaultSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
solutionIds = ["#option1", "#option2", "#option3", "#option4"];    
optionTextIds = ["#MCQSolTxt1", "#MCQSolTxt2", "#MCQSolTxt3", "#MCQSolTxt4"];
optionImageIds = ["#MCQSolImg1", "#MCQSolImg2", "#MCQSolImg3", "#MCQSolImg4"]; 
contentImageIds = ["#contentImg1", "#contentImg2", "#contentImg3", "#contentImg4"];   


$(document).scroll(function(){
    window.scrollTo(0, 0);
});

$(document).ready(() => {
    console.log("ready");
    $('.sidenav').sidenav({
        preventScrolling: true,
        draggable: true
    });
    
    var totalH = $("#slide-out").height();
    var topH = $(".slide-out-top").height();    
    $("#side-scroller").height(totalH-topH-50);
    $('.fixed-action-btn').floatingActionButton({        
        direction: 'left'
    });
    $(".tooltipped").tooltip();

    $('.characterCountable').characterCounter();

    $(".inputSection").height(window.innerHeight-$("header").height()-(0.02*window.innerHeight));

    $("#questionImageSwitch").change(() => {            
        if ($("#questionImageSwitch").is(":checked")){
            $("#questionImageContainer").fadeIn();
        } else {
            $("#questionImageContainer").fadeOut();
        }
    });

    $("#optionImageSwitch").change(() => {
        if ($("#optionImageSwitch").is(":checked")){
            $(".optionImageHolder").fadeIn();
        } else {
            $(".optionImageHolder").fadeOut();
        }
    });

    loadMaterialModalPromise(".modalContainer").then(()=>{        
        fetchPaperData(getUrlParameter("paperId"));
    });


    $('input[type=radio][name=solType]').change(function() {
        switch($(this).attr('id')){
            case "solDesc":
                $(".MCQSolContainer").hide();
                $(".descSolContainer").show();
                break;
            case "solMCQ":
                $(".MCQSolContainer").show();
                $(".descSolContainer").hide();
                break;
        }
    });

});

var removeImage = (elem) => {        
    $(elem).parent().parent().children("input").val('');
    $(elem).parent().parent().children("img").attr("src", defaultSrc);    
}

var chooseImage = (elem) => {
    $(elem).parent().children("input").trigger("click");
}

var readImageFromDisk = (input, target = $(input).parent().children("img")) => {
    console.log("reading from disk");
    if (input.files && input.files[0]) {
        var reader = new FileReader();        
        reader.onload = function(e) {            
            $(target).attr('src', e.target.result);
        }        
        reader.readAsDataURL(input.files[0]);
    }
}

var fetchPaperData = (paperId) => {
    $("#examName").text(getUrlParameter("exam"));
    engageProgress({
        msg: "Reading paper..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-read-paper",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            paperId: paperId
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            if (responseBody.paperData.questions.length==0){                
                M.toast({html: "This paper has no associated questions"});                
            }            
            responseBody.paperData.questions.forEach((v, i) => {             
                hmtlString = "<p>"+v.sectionName+"</p>";
                v.questionList.forEach((v, i) => {
                    hmtlString += "<div class='chip' qid=\""+v+"\" onclick=\"fetchQuestion(this, '"+v+"')\">"+(i+1)+"</div>"
                });
                hmtlString += "<div class='divider'></div>"
                $("#slide-out").append("<div id='sectionContainer'>"+hmtlString+"</div>");
                $(".myBreadcrumb.examAbbreviation").text(responseBody.paperData.examAbbreviation);
                $(".myBreadcrumb.paperName").text(responseBody.paperData.paperName);
            });                
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch any more!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot fetch papers",
                body: "Something went wrong."
            });
        }
    });
}

var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};

var fetchQuestion = (elem) => {
    console.log("Fetching question: ", $(elem).attr("qid"));    
    engageProgress({
        msg: "Reading question..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-read-question",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            questionId: $(elem).attr("qid")
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();            
        if (responseBody.statusCode==1){            
            console.log("Question Read");
            selectQuestionChip(elem);
            $(".optionImage").attr("src", defaultSrc);
            try{
                $("#questionText").val(responseBody.questionData.questionText);
                //contentImageIds = ["#contentImg1", "#contentImg2", "#contentImg3", "#contentImg4"];   
                if (responseBody.questionData.contentImagesAvailable>0){                            
                    responseBody.questionData.contentImages.forEach((v, i) => {
                        $(contentImageIds[i]).attr("src", v);
                    });
                } else {
                    contentImageIds.forEach((v, i) => {
                        $(contentImageIds[i]).attr("src", defaultSrc);
                    });
                }
                switch(responseBody.questionData.solutionType){
                    case SOLUTION_TYPE_MCQ:
                        $("#solMCQ").prop("checked", true).change();
                        //optionImageIds = ["#MCQSolImg1", "#MCQSolImg2", "#MCQSolImg3", "#MCQSolImg4"];   
                        if (responseBody.questionData.optionImagesAvailable>0){                            
                            responseBody.questionData.optionImages.forEach((v, i) => {
                                $(optionImageIds[i]).attr("src", v);
                            });
                        } else {
                            optionImageIds.forEach((v, i) => {
                                $(optionImageIds[i]).attr("src", defaultSrc);
                            });
                        }
                        //optionTextIds = ["#MCQSolTxt1", "#MCQSolTxt2", "#MCQSolTxt3", "#MCQSolTxt4"]; 
                        responseBody.questionData.optionTexts.forEach((v, i) => {
                            $(optionTextIds[i]).val(v);
                        });
                        //solutionIds = ["#option1", "#option2", "#option3", "#option4"];
                        solutionIds.forEach((v, i) => {
                            $(v).prop("checked", false);
                        });        
                        responseBody.questionData.solution.forEach((v, i) => {
                            $(solutionIds[v]).prop("checked", true);
                        });
                        break;
                    case SOLUTION_TYPE_DESCRIPTIVE:
                        $("#solDesc").prop("checked", true).change();
                        break;
                }
                $("#explanationText").val(responseBody.questionData.explanation);
                $("#positiveMarksText").val(responseBody.questionData.positiveMarks);
                $("#negativeMarksText").val(responseBody.questionData.negativeMarks);
                M.updateTextFields();
                $(".placeholder").hide();
                $(".mainContainer").show();
            } catch (err) {
                console.log(err);
                engageDialog({head: "Fatal Warning", body: "Something is wrong with this question. Report this incident to the administrators immediately"});
            } 
        } else if (responseBody.cause == 350) {
            console.log("Unset Question");
            $(".placeholder").hide();
            $(".mainContainer").show();
            selectQuestionChip(elem);
            M.toast({html: "This question is yet to be written"});            
            $("#questionText").val(null);            
            $("#explanationText").val(null);
            $(".optionImage").attr("src", defaultSrc);            
            solutionIds.forEach((v, i) => {
                $(v).prop("checked", false).change();
            });
            optionTextIds.forEach((v, i) => {
                $(v).val(null);
            });
            $("#solMCQ").prop("checked", true).change();
            $("#positiveMarksText").val(null);
            $("#negativeMarksText").val(null);
            M.updateTextFields();
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Oops!",
                body: "Something went wrong while fetching this question, If this issue does not reolves in a minute or two, contact the administrators"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot fetch question",
                body: "Something went wrong."
            });
        }
    });
    
};

var uploadQuestion = () => {
    //prepare the data
    var solutionTypeId = $("input[name='solType']:checked").attr("id");
    //contentImageIds = ["#contentImg1", "#contentImg2", "#contentImg3", "#contentImg4"];    
    var data  = {
        questionId: $("#sectionContainer .chip.active").attr("qid"),
        questionText: $("#questionText").val(),
        contentImagesAvailable: 0,
        contentImages: [],
        optionImagesAvailable: 0,
        optionImages: [],
        solutionType: solutionTypeId==="solMCQ"?1:(solutionTypeId==="solDesc"?2:undefined),
        solution: [],
        explanation: $("#explanationText").val(),
        positiveMarks: Number($("#positiveMarksText").val()),
        negativeMarks: Number($("#negativeMarksText").val())
    };
    console.log(JSON.stringify(data));
    //return;    
    
    
    for (var i=0; i<contentImageIds.length; i++){
        if ($(contentImageIds[i]).attr("src") == defaultSrc){
            break;
        } else {
            data.contentImages.push($(contentImageIds[i]).attr("src"));
            data.contentImagesAvailable++;
        }
    }    
    console.log("Content Images: ", data.contentImagesAvailable);
    switch(data.solutionType){
        case SOLUTION_TYPE_DESCRIPTIVE:            
            data.solution.push($("#descAns").val());            
            break;
        case SOLUTION_TYPE_MCQ:            
            //optionImageIds = ["#MCQSolImg1", "#MCQSolImg2", "#MCQSolImg3", "#MCQSolImg4"];            
            optionImageIds.forEach((id, i) => {
                if ($(id).attr("src") == defaultSrc){
                    data.optionImages.push(undefined);
                } else {
                    data.optionImages.push($(id).attr("src"));
                    data.optionImagesAvailable++;
                }
            });            
            //optionTextIds = ["#MCQSolTxt1", "#MCQSolTxt2", "#MCQSolTxt3", "#MCQSolTxt4"];            
            optionTexts = [];
            optionTextIds.forEach((id, i) => {
                optionTexts.push($(id).val());
            });
            data.optionTexts = optionTexts;
            //solutionIds = ["#option1", "#option2", "#option3", "#option4"];            
            solutionIds.forEach((id, i) => {
                if ($(id).prop("checked")){
                    data.solution.push(i);
                }
            });            
            break;
        default: 
            engageDialog({
                head: "Invalid Question",
                body: "Invalid SolutionType Chosen"
            });
            return;
    }
    console.log(data);
    //console.log("Validating: ", JSON.stringify(data));    
    
    //validate the data
    try{
        if ($.trim(data.questionId).length<1){
            throw new ValidationError("There is a problem with this question. Contact the administrator.");
        }
        if (!data.solutionType){
            throw new ValidationError("Solution Type is not chosen");
        }
        if ($.trim(data.questionText).length<1){
            throw new ValidationError("Question Text cannot be empty");       
        }
        if (data.solutionType === SOLUTION_TYPE_MCQ){
                       
            var filledOptionTexts = 0;
            data.optionTexts.forEach((v, i) => {
                if (v) filledOptionTexts++;
            });                        
            //else throw new ValidationError("Either fill all texts or remove partial ones");
            var filledOptionImages = 0;
            data.optionImages.forEach((v, i) => {
                if (v) filledOptionImages++;
            });           
            if (!(filledOptionTexts + filledOptionImages === 4 || filledOptionTexts + filledOptionImages === 8)){
                throw new ValidationError("Either Images or Text must be chosen for all Options");
            }
            if (!data.solution || data.solution.length<1) throw new ValidationError("Atleast 1 option must be selected as the solution"); 
        } else {
            if ($.trim(data.solution).length<1) throw new ValidationError("Model answer cannot be empty");
        }
        if (!data.positiveMarks || data.positiveMarks<0 || !data.negativeMarks || data.negativeMarks<0) throw new ValidationError("Marks must be positive and non empty");

    } catch (err) {
        console.log("Validation Exception: ", err);
        engageDialog({
            head: "Invalid Question",
            body: (err instanceof ValidationError)?err.message:"Some parts of the question are not as they should be"
        });
        return;
    }
    console.log("Validated");
    
    //data validated...begin transmission
    engageProgress({
        msg: "Composing question..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-compose-question",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(data)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();            
        if (responseBody.statusCode==1){            
            M.toast({html: "Question Composed!"});                          
        } else {            
            engageDialog({
                head: "Oops!",
                body: responseBody.cause==250?"Please fill out all the fields properly":"Something went wrong while composing this question. If this issue does not reolves in a minute or two, contact the administrators"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Oops!",
                body: "Please recheck your internet connectivity or login again and retry"
            });
        }
    });
}

var selectQuestionChip = (elem) => {
    $(".chip").removeClass("active");
    $(".chip").removeClass("pulse");
    $(elem).addClass("active");
    $(elem).addClass("pulse");
}



  
