var selectedPackageId, selectedPackageName;

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

$(document).ready(() => {
    $("header").load("/content/layout/navbar.html", () => {        
        $("ul.tabs li:eq(0) a").addClass("active");
        $("main").css({"margin-top": $("header").height()});
        $(".slide-out-top").prepend('\
            <div class="row" style="margin: 0; padding: 0; margin: 0">\
                <div class="col s12 sectorSelectContainer">\
                    <select id="sectorList">\
                        <option disabled selected>Choose Sector</option>\
                    </select>\
                </div>\
            </div>\
        ');
        $("#sectorList").on("change", () => {
            $("#sectorList").formSelect();
            fetchAllExams($("#sectorList").formSelect('getSelectedValues')[0]);
            console.log($("#sectorList").formSelect('getSelectedValues')[0]);
            $("#sectorPreview").text($("#sectorList").formSelect('getSelectedValues')[0]);
            $("#fab").css({"visibility": "visible"});
        });        
        loadMaterialModalPromise(".modalContainer").then(()=>{    
            M.AutoInit();            
            $('.characterCountable').characterCounter();
            $(".sidenavHeader").html("Existing Exams<i style=\"margin-right: 10px\" class='material-icons'>format_shapes</i>"); 
            //enlistPackages();   
            //fetchAllExams();  
            fetchSectors();     
        }); 
        //$('.sidenav').sidenav(); 
        var clipboard = new ClipboardJS('#copier');      
        clipboard.on('success', function(e) {
            M.toast({html: "Exam ID Copied"});
            e.clearSelection();
        });
    });
    
});

var fetchAllExams = (sectorName) => {
    console.log("fetching exam names for sector: ", sectorName);
    engageProgress({
        msg: "Fetching exams ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-exam-names",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            sectorName: sectorName
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                        
            $(".sidenavElement").remove();
            $(".divider").remove();
            if (responseBody.examNames.length==0){                
                M.toast({html: "No exams to fetch"});
            } else {                
                responseBody.examNames.forEach((v, i) => {                
                    //$("#examSelector").append("<option>"+v.abbreviation+"</option>");
                    $("ul.sidenav").append(getSidenavElementBody(v.examId, v.abbreviation));
                });                             
            }
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
                head: "Cannot fetch exams",
                body: "Something went wrong."
            });
        }
    });
}

var fetchExam = (element) => {
    examId = $(element).attr("data");
    engageProgress({
        msg: "Fetching exam..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-exam",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            examId: examId
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){
            console.log(responseBody.exam.abbreviation);    
            $("#examDataAbbvText").text(responseBody.exam.abbreviation);                                
            $("#examIdText").text(responseBody.exam.examId);
            $("#examDataNameText").val(responseBody.exam.name);
            $("#examDataTargetText").val(responseBody.exam.targetYear);
            $("#examDataMarksText").val(responseBody.exam.totalMarks);
            $("#examDataPatternText").val(responseBody.exam.patternYear);
            M.updateTextFields();
            $("#chipContainer").empty();
            if (responseBody.exam.sections && responseBody.exam.sections.length>0){
                responseBody.exam.sections.forEach((v, i) => {
                    $("#chipContainer").append('<div class="chip waves-effect" data=\''+JSON.stringify(v)+'\' onclick="editSection(this)">'+v.name+'<i onclick="event.stopPropagation(); $(this).parent().remove();" class="close material-icons">close</i></div>');
                });
            }
            $(".sidenavElement").removeClass("active");
            $(element).addClass("active");
            $(".container.placeholder").fadeOut("fast", () => {
                $(".container.primary").fadeIn("fast");
            });
        } else {//https://33qo10kq34.execute-api.ap-southttps://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-exam-sectionh-1.amazonaws.com/prod/update-exam-section
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
                head: "Cannot fetch exam",
                body: "Something went wrong."
            });
        }
    });
}

var editSection = (element) => {
    sectionData = $(element).attr("data");
    if (!sectionData){
        M.toast({html: "Something went wrong"});
        return;
    }    
    sectionData = JSON.parse(sectionData);
    $("#sectorEditExam").text($(".sidenavElement.active .examAbbreviation").text());
    $("#sectionNameText").val(sectionData.name);
    $("#sectionQsnText").val(sectionData.questionCount);
    M.updateTextFields();
    $("#sectionContainer").modal("open");
    $("#sectionApplyButton").off("click");
    $("#sectionApplyButton").click(() => {
        data = {
            questionCount: $("#sectionQsnText").val(),
            name: $("#sectionNameText").val()
        }
        console.log("Updating with: "+JSON.stringify(data));
        $(element).attr("data", JSON.stringify(data));
        $(element).html(data.name+'<i class="close material-icons" onclick="event.stopPropagation(); $(this).parent().remove();">close</i></div>');       
        $("#sectionContainer").modal("close"); 
    });
}

var createNewSection = () => {
    $("#sectionNameText").val("");
    $("#sectionQsnText").val("");    
    M.updateTextFields();
    $("#sectorEditExam").text($(".sidenavElement.active .examAbbreviation").text());
    if (!$("#sectorEditExam").text()){
        M.toast({html: "Select an exam first"});
        return;
    }
    $("#sectionContainer").modal("open");
    $("#sectionNameText").focus(); 
    $("#sectionApplyButton").off("click");
    $("#sectionApplyButton").click(() => {
        data = {
            questionCount: $("#sectionQsnText").val(),
            name: $("#sectionNameText").val()
        }
        if (!data.questionCount || !data.name){
            M.toast({html: "All fields are required"});            
        } else {
            $("#chipContainer").append('<div class="chip waves-effect" onclick="editSection(this)" data=\''+JSON.stringify(data)+'\'>'+data.name+'<i class="close material-icons" onclick="event.stopPropagation(); $(this).parent().remove();">close</i></div>');
            $("#sectionNameText").val("");
            $("#sectionQsnText").val("");       
            $("#sectionContainer").modal("close");
        }
         
    });
}

var copyExamId = () => {
    var src = $("#examIdText");
    src.select();
    //src.text().setSelectionRange(0, 99999);
    console.log(document.execCommand("copy"));
}

var fetchSectors = () => {
    console.log("fetching sectors");
    engageProgress({
        msg: "Fetching sectors ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-sectors",
        headers: {
            "Authorization": Cookies.get("token")
        }
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                        
            $("#sectorList").empty().append('<option disabled selected>Choose Sector</option>');
            $("#creationSectorList").empty().append('<option disabled selected>Choose Sector</option>');                        
            if (responseBody.sectors.length==0){                
                M.toast({html: "No sectors to fetch"});                
            } else {                
                responseBody.sectors.forEach((v, i) => {                                    
                    $("#sectorList").append("<option data='"+v.sectorName+"'>"+v.sectorName+"</option>");
                    $("#creationSectorList").append("<option data='"+v.sectorName+"'>"+v.sectorName+"</option>");
                });    
                $("#sectorList").formSelect();
                //$("#creationSectorList").formSelect();                                
            }            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch any more!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot fetch exams",
                body: "Something went wrong."
            });
        }
    });
}

var createExam = () => {    
    examData = {
        "abbreviation": $("#examAbbvText").val(),
        "fullName": $("#examNameText").val(),
        "sector": $("#sectorPreview").text(),
        "targetYear": $("#examTargetText").val(),
        "patternYear": $("#examPatternText").val(),
        "totalMarks": $("#examMarksText").val(),
    }
    var allowed = true;
    Object.entries(examData).forEach(([key, value]) => {
        if (value.trim().length==0) allowed = false;
    });
    if (!allowed){
        engageDialog({
            head: "Invalid Exam Configured",
            body: "All fields must be filled"
        })
        return;
    }
    engageProgress({
        msg: "Creating exam..."
    });    
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/create-exam",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(examData)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){
            $("#inputContainer").modal('close');
            $(".clear").val("");
            M.AutoInit();       
            M.updateTextFields();                 
            M.toast({html: "Exam Created"});
            $("ul.sidenav").append(getSidenavElementBody(responseBody.createdExam.examId, responseBody.createdExam.abbreviation));
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't create exam",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Couldn't create exam",
                body: "Something went wrong"
            });
        }
    });
}

var updateExamSections = () => {
    sectionData = {
        examId: $(".sidenavElement.active").attr("data"),
        sections: []
    };    
    $("#chipContainer").children(".chip").each((i, v) => {
        ob = JSON.parse($(v).attr("data"));
        sectionData.sections.push({
            name: ob.name.trim(),
            questionCount: parseInt(ob.questionCount)
        });
    });
    console.log(JSON.stringify(sectionData));    
    engageProgress({
        msg: "Updating Sections..."
    });   
     
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-exam-section",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(sectionData)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            M.toast({html: "Sections Updated"});            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't update exam",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Couldn't update exam",
                body: "Something went wrong"
            });
        }
    });
}

var updateExamData = () => {
    examData = {
        examId: $(".sidenavElement.active").attr("data"),
        name: $("#examDataNameText").val(),
        targetYear: $("#examDataTargetText").val(),
        totalMarks: $("#examDataMarksText").val(),
        patternYear: $("#examDataPatternText").val()
    }  
    var allowed = true;
    Object.entries(examData).forEach(([key, value]) => {
        if (value.trim().length==0) allowed = false;
    });
    if (!allowed){
        M.toast({html: "All fields must be filled and an exam must be selected"});
        return;
    }
    engageProgress({
        msg: "Updating Exam..."
    });   
    console.log(examData);
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-exam-data",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(examData)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            M.toast({html: "Exam Updated"});            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't update exam",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Couldn't update exam",
                body: "Something went wrong"
            });
        }
    });
}

var getSidenavElementBody = (examId, examAbbreviation) => {
    return '\
    <li>\
        <div onclick="fetchExam(this)" data="'+examId+'" class="waves-effect sidenavElement">\
            <a class="examAbbreviation">'+examAbbreviation+'</a>\
        </div>\
        <li><div style="margin-top: 0" class="divider"></div></li>\
    </li>\
    ';
}
