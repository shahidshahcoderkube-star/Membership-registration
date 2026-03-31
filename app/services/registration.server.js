import prisma from "../db.server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function drawWrappedText(pdfDoc, page, text, font, size, x, startY, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let y = startY;
  let currentPage = page;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const textWidth = font.widthOfTextAtSize(testLine, size);
    if (textWidth > maxWidth && i > 0) {
      currentPage.drawText(line.trim(), { x, y, size, font, color: rgb(0,0,0) });
      line = words[i] + " ";
      y -= lineHeight;
      if (y < 80) { 
        currentPage = pdfDoc.addPage([600, 800]);
        y = 730; 
      }
    } else {
      line = testLine;
    }
  }
  if (line.trim().length > 0) {
    currentPage.drawText(line.trim(), { x, y, size, font, color: rgb(0,0,0) });
    y -= lineHeight;
    if (y < 80) {
       currentPage = pdfDoc.addPage([600, 800]);
       y = 730;
    }
  }
  return { page: currentPage, y };
}

export async function finalizeRegistration({ admin, email, firstName, lastName, signature, agreement, createdAt }) {
  // 1. Generate PDF with Signature
  let pdfBytes;
  try {
    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([600, 800]);
    
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let currentY = 720;

    // Title
    currentPage.drawText('Membership Agreement', { x: 50, y: currentY, size: 20, font: boldFont, color: rgb(0, 0, 0) });
    currentY -= 40;
    
    // Email line
    currentPage.drawText('Email: ', { x: 50, y: currentY, size: 12, font: boldFont, color: rgb(0, 0, 0) });
    const emailObjWidth = boldFont.widthOfTextAtSize('Email: ', 12);
    currentPage.drawText(`${email}`, { x: 50 + emailObjWidth, y: currentY, size: 12, font: regularFont, color: rgb(0, 0, 0) });
    currentY -= 30;

    const paragraphs = [
      "Membership Application",
      "Living Light Health– A non-sectarian, non-denominational Private Ministerial Association",
      "By joining Living Light Health, a Private Membership Association and/or any website or Social Media Group started by, created by, maintained, or organized by the Association, I agree to the terms and conditions of Living Light Health, a Private Membership Association, Agreement as follows.",
      "This Association of members declares that our objective is to allow the Private Membership Association founders and all Private Membership Association members with a platform in which to conduct all manner of private business with the Association and with other Associations and Association members, keeping all business in the private domain and utilizing the protections guaranteed by the Universal Declaration of Human Rights (UDHR), the Constitution to conduct business in private and to provide a platform for members to conduct business in the private domain under all protections acknowledged and guaranteed by the Constitution of the UNITED STATES, and any previous protections guaranteed.",
      "We believe that the Holy Scriptures, the Universal Declaration of Human Rights (UDHR), the Constitution of the United States of America, the various constitutions of the several states of the union, and the Charter of Rights of Canada guarantees our members the rights of absolute freedom of religion, free speech, petition, assembly, and the right to gather together for the lawful purpose of helping one another in asserting our rights protected by those Constitutions, Charter and Statutes, in addition to the rights to be free from unreasonable search and seizure, the right to not incriminate ourselves, and the right to freely exercise all other unalienable rights as granted by our creator, our almighty God and guaranteed by those Constitutions, Charter, and Statutes. WE HEREBY Declare that we are exercising our right of \"freedom of association\" as guaranteed by the Universal Declaration of Human Rights (UDHR), the U.S. Constitution and equivalent provisions of the various State Constitutions, as well as the Charter of Rights of Canada. This means that our Association activities are restricted to the private domain only and outside of the jurisdiction of government entities, agencies, officers, agents, contractors, and other representatives as provided by law.",
      "We declare the basic right of all of our members to decide for themselves which Association members could be expected to give wise counsel and advice concerning all matters including, but not limited to education, physical, spiritual, and mental health care assistance, law, and any other matter and to accept from those members any and all counsel, advice, tips, whom we feel are able to properly advise and assist us.",
      "We expect the freedom to choose and perform for ourselves the types of therapies and treatments that we think best for diagnosing, treating, and preventing illness and disease and for achieving and maintaining optimum wellness, as well as the freedom to choose for ourselves any types of assistance which may be made regarding law and any other private business activity.",
      "The mission of this Association is to provide members with a forum to conduct business between members in the private domain with the protections guaranteed within the aforesaid Constitution and Charter remaining fully intact.",
      "The Association will recognize any person(s), natural or otherwise (irrespective of race, color, or religion) who have joined this Association or any social media group organized, created, or managed by this Association and is in agreement with these principles and policies as a member of this Association, providing said person has not been sanctioned, exercised, or otherwise banned by the association, and will provide a medium through which its individual members may associate for actuating and bringing to fruition the purposes heretofore declared.",
      "Membership to this Association, \"Living Light Health\", and any of its groups may be terminated by the association Trustees or their designee, at any time, should they conclude that a specific member is interacting with them or any other members in a way that is contrary or detrimental to the focus, principles, and betterment of this Association.",
      "I understand that, since The Association is protected by the First, Fourth, Fifth, Ninth and Tenth Amendments to the U.S. Constitution, it is outside the jurisdiction and authority of Federal and State Agencies and Authorities concerning any and all complaints or grievances against The Association members or other staff persons. All rights of complaints or grievances will be settled by an Association designee, committee, or tribunal and will be waived by the member for the benefit of The Association and its members. By agreeing to this membership form I agree that I have sought sufficient education to determine that this is the course of action I want to take for myself.",
      "I agree to join Living Light Health, a private membership association under common law, whose members seek to help each other achieve better health and good quality of life. I am voluntarily changing my capacity from that of a public person to that of a private member. My activities within The Association are a private contractual matter that I refuse to share with the Local, State, or Federal investigative or enforcement agencies. I fully agree not to pursue any course of legal action against a fellow member of The Association, unless that member has exposed me to a clear and present danger of substantive evil, and upon the recommendation and approval of the Association.",
      "I enter into this agreement of my own free will without any pressure or coercion. I affirm that I do not represent any Local, State or Federal agency whose purpose is to regulate and approve products or services, or to carry out any mission of enforcement, entrapment or investigation. I have read and understood this document, and my questions have been answered fully to my satisfaction. I understand that I can withdraw from this agreement and terminate my membership in this association at any time, and that my membership can and will be revoked if I engage in abusive, violent, menacing, destructive or harassing behavior towards any other member of The Association. These pages consist of the entire agreement for my membership in The Association.",
      "I agree this contract began on the date of my joining \"Living Light Health\". I declare that by joining this Association and/or the Associations websites and/or social media group(s), I have carefully read the whole of this document and I understand and agree with it."
    ];

    for (const p of paragraphs) {
      const pStatus = await drawWrappedText(pdfDoc, currentPage, p, regularFont, 12, 50, currentY, 500, 16);
      currentPage = pStatus.page;
      currentY = pStatus.y - 12;
    }

    currentY -= 20;
    if (currentY < 180) {
       currentPage = pdfDoc.addPage([600, 800]);
       currentY = 730;
    }
    
    currentPage.drawText('Signature:', { x: 50, y: currentY, size: 14, font: boldFont, color: rgb(0,0,0) });

    if (signature) {
      const base64Data = signature.replace(/^data:image\/(png|jpeg);base64,/, "");
      const imageBytes = Buffer.from(base64Data, 'base64');
      const embeddedImage = await pdfDoc.embedPng(imageBytes);
      const imgDims = embeddedImage.scale(0.5);
      
      currentPage.drawRectangle({
         x: 50,
         y: currentY - imgDims.height - 10,
         width: imgDims.width,
         height: imgDims.height,
         borderColor: rgb(0.8, 0.8, 0.8),
         borderWidth: 1,
      });

      currentPage.drawImage(embeddedImage, {
        x: 50,
        y: currentY - imgDims.height - 10,
        width: imgDims.width,
        height: imgDims.height,
      });
      currentY = currentY - imgDims.height - 30;
    } else {
      currentY = currentY - 80;
    }

    const d = new Date(createdAt || Date.now());
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    
    if (currentY < 50) {
        currentPage = pdfDoc.addPage([600, 800]);
        currentY = 750;
    }
    currentPage.drawText(`Signed on: ${dateStr}`, { x: 50, y: currentY, size: 12, font: regularFont, color: rgb(0,0,0) });

    pdfBytes = await pdfDoc.save();
  } catch (pdfErr) {
    console.error("PDF generation failed:", pdfErr);
    throw new Error("Failed to generate agreement PDF.");
  }

  // 2. Upload to Shopify Staged Uploads
  let genericFileId = "";
  try {
    const stagedUploadsMutation = `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters { name value }
          }
        }
      }`;
      
    const stagedUploadResponse = await admin.graphql(stagedUploadsMutation, {
      variables: {
        input: [{
          resource: "FILE",
          filename: `${firstName}_Agreement.pdf`,
          mimeType: "application/pdf",
          httpMethod: "POST"
        }]
      }
    });
    const stagedData = await stagedUploadResponse.json();
    const target = stagedData.data.stagedUploadsCreate.stagedTargets[0];
    
    const formData = new FormData();
    target.parameters.forEach(param => { formData.append(param.name, param.value); });
    
    const fileBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    formData.append('file', fileBlob, `${firstName}_Agreement.pdf`);
    
    const uploadRes = await fetch(target.url, { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

    const fileCreateMutation = `
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            id
            fileErrors { message }
          }
        }
      }`;
    
    const fileCreateRes = await admin.graphql(fileCreateMutation, {
      variables: {
        files: [{
          alt: "Membership Agreement Signature PDF",
          contentType: "FILE",
          originalSource: target.resourceUrl
        }]
      }
    });
    const fcData = await fileCreateRes.json();
    const createdFile = fcData.data?.fileCreate?.files?.[0];
    
    if (createdFile && createdFile.id) {
      genericFileId = createdFile.id;
    }
  } catch (uploadError) {
    console.error("File upload to Shopify Failed: ", uploadError);
    throw new Error("Failed to securely save signed agreement to Shopify.");
  }

  // 3. Create/Update Customer
  const customerInput = { firstName, lastName, email };
  if (genericFileId) {
    customerInput.metafields = [{
      namespace: "custom",
      key: "membership_agreement",
      type: "file_reference",
      value: genericFileId
    }];
  }

  const customerMutation = `
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id }
        userErrors { message }
      }
    }`;

  const customerResponse = await admin.graphql(customerMutation, {
    variables: { input: customerInput }
  });

  const customerData = await customerResponse.json();
  if (customerData.data?.customerCreate?.userErrors?.length > 0) {
    throw new Error(customerData.data.customerCreate.userErrors[0].message);
  }

  return customerData.data?.customerCreate?.customer?.id;
}
