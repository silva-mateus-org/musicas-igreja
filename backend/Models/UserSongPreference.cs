using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace MusicasIgreja.Api.Models;

public class UserSongPreference
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string UserId { get; set; } = string.Empty;

        [Required]
    public int PdfFileId { get; set; }

    [ForeignKey("PdfFileId")]
    [JsonIgnore]
    public PdfFile? PdfFile { get; set; }

        public int TransposeAmount { get; set; } = 0;
        public int CapoFret { get; set; } = 0;

        // Armazena a ordem customizada das seções do ChordPro em JSON. Ex: ["Verso 1", "Refrão", "Verso 2"]
        [Column(TypeName = "json")]
        public string? ArrangementJson { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
