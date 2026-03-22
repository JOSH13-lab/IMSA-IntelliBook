/**
 * Service pour l'envoi d'emails (Nodemailer)
 * Actuellement un stub pour IMSA IntelliBook
 */

const sendEmail = async (to, subject, text, html) => {
  console.log(`📧 Simulation d'envoi d'email à : ${to}`);
  console.log(`📝 Objet : ${subject}`);
  // Ici viendrait la config nodemailer future
  return true;
};

module.exports = { sendEmail };
